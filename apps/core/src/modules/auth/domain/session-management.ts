import { and, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Clock } from '../../../kernel/clock.js';
import type { DbExec } from '../../../kernel/context.js';
import { effectiveSessions } from '../../../kernel/session.js';
import { sessions } from '../../../schema/index.js';

export async function getGlobalSessionPage(
  db: DbExec,
  clock: Clock,
  actor: { userId: string; currentSessionId: string | null },
  input: { page: number; pageSize: number; userIds?: readonly string[] },
) {
  const where = and(
    effectiveSessions(clock.now()),
    input.userIds
      ? input.userIds.length
        ? inArray(sessions.userId, [...input.userIds])
        : sql`false`
      : undefined,
  );

  const [list, totals, otherUsers] = await Promise.all([
    db
      .select({
        handle: sessions.publicId,
        userId: sessions.userId,
        current: sql<boolean>`coalesce(${sessions.id} = ${actor.currentSessionId}, false)`,
        kind: sessions.kind,
        impersonatorUserId: sessions.impersonatorUserId,
        createdAt: sessions.createdAt,
        lastActiveAt: sessions.lastActiveAt,
        ip: sessions.ip,
        ua: sessions.ua,
      })
      .from(sessions)
      .where(where)
      .orderBy(desc(sessions.lastActiveAt), sessions.publicId)
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
    db.select({ total: count() }).from(sessions).where(where),
    db
      .select({ total: count() })
      .from(sessions)
      .where(and(effectiveSessions(clock.now()), ne(sessions.userId, actor.userId))),
  ]);

  return {
    list,
    total: totals[0]?.total ?? 0,
    page: input.page,
    pageSize: input.pageSize,
    onlyOwn: (otherUsers[0]?.total ?? 0) === 0,
  };
}

export async function getManagedSession(
  db: DbExec,
  clock: Clock,
  handle: string,
  currentSessionId: string | null,
) {
  const [row] = await db
    .select({
      handle: sessions.publicId,
      userId: sessions.userId,
      current: sql<boolean>`coalesce(${sessions.id} = ${currentSessionId}, false)`,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .where(and(eq(sessions.publicId, handle), effectiveSessions(clock.now())))
    .for('update');

  return row;
}

export async function revokeManagedSession(db: DbExec, clock: Clock, handle: string) {
  const [row] = await db
    .update(sessions)
    .set({ revokedAt: clock.now() })
    .where(and(eq(sessions.publicId, handle), effectiveSessions(clock.now())))
    .returning({ handle: sessions.publicId, revokedAt: sessions.revokedAt });

  return row;
}
