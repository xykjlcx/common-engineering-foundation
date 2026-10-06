import { and, count, countDistinct, desc, eq, gte, isNull, lt, lte, sql } from 'drizzle-orm';
import type { Ctx, DbExec } from '../../kernel/context.js';
import { auditLogs, sessions } from '../../schema/index.js';
import { loginEvents } from '../auth/schema.js';
import { depts } from '../dept/schema.js';
import { getRecentOperations } from '../audit/api.js';

export function overviewDays(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)?.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const end = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: 14 }, (_, index) =>
    new Date(end - (13 - index) * 86400000).toISOString().slice(0, 10),
  );
}

export async function previousLogin(ctx: Pick<Ctx, 'db' | 'userId' | 'sessionId'>) {
  if (!ctx.sessionId) return null;
  const [session] = await ctx.db
    .select({ createdAt: sessions.createdAt })
    .from(sessions)
    .where(eq(sessions.id, ctx.sessionId));
  if (!session) return null;
  const [event] = await ctx.db
    .select({ at: loginEvents.occurredAt, ip: loginEvents.ip, ua: loginEvents.ua })
    .from(loginEvents)
    .where(
      and(
        eq(loginEvents.userId, ctx.userId),
        eq(loginEvents.outcome, 'success'),
        lt(loginEvents.occurredAt, session.createdAt),
      ),
    )
    .orderBy(desc(loginEvents.occurredAt), desc(loginEvents.id))
    .limit(1);
  return event ? { ...event, at: event.at.toISOString() } : null;
}

export async function auditSummary(db: DbExec, now: Date, timeZone: string) {
  const days = overviewDays(now, timeZone);
  const start = sql`(${days[0]}::date::timestamp AT TIME ZONE ${timeZone})`;
  const loginDate = sql<string>`to_char(${loginEvents.occurredAt} AT TIME ZONE ${timeZone}, 'YYYY-MM-DD')`;
  const auditDate = sql<string>`to_char(${auditLogs.createdAt} AT TIME ZONE ${timeZone}, 'YYYY-MM-DD')`;
  // 按投影序号分组，避免时区参数在 SELECT/GROUP BY 生成不同占位符。
  const [loginRows, changeRows, lockedRows, recentChanges] = await Promise.all([
    db
      .select({
        date: loginDate,
        success: sql<number>`count(*) filter (where ${loginEvents.outcome} = 'success')`.mapWith(Number),
        failure: sql<number>`count(*) filter (where ${loginEvents.outcome} = 'failure')`.mapWith(Number),
      })
      .from(loginEvents)
      .where(and(gte(loginEvents.occurredAt, start), lte(loginEvents.occurredAt, now)))
      .groupBy(sql`1`),
    db
      .select({ date: auditDate, count: count() })
      .from(auditLogs)
      .where(
        and(gte(auditLogs.createdAt, start), lte(auditLogs.createdAt, now), eq(auditLogs.outcome, 'success')),
      )
      .groupBy(sql`1`),
    db
      .select({ count: countDistinct(loginEvents.username) })
      .from(loginEvents)
      .where(
        and(
          eq(loginEvents.outcome, 'locked'),
          gte(loginEvents.occurredAt, new Date(now.getTime() - 86400000)),
          lte(loginEvents.occurredAt, now),
        ),
      ),
    getRecentOperations(db, now, 5),
  ]);
  const today = loginRows.find((row) => row.date === days.at(-1));
  return {
    loginsToday: { success: today?.success ?? 0, failure: today?.failure ?? 0 },
    trend: days.map((date) => ({
      date,
      logins: loginRows.find((row) => row.date === date)?.success ?? 0,
      changes: changeRows.find((row) => row.date === date)?.count ?? 0,
    })),
    recentChanges,
    lockedAccounts: lockedRows[0]?.count ?? 0,
  };
}

export async function deptsWithoutLeader(db: DbExec) {
  const [row] = await db
    .select({ count: count() })
    .from(depts)
    .where(and(eq(depts.enabled, true), isNull(depts.leaderId)));
  return row?.count ?? 0;
}
