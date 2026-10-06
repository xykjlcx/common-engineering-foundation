import { and, count, countDistinct, eq, gt, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { sessions } from '../schema/index.js';
import type { Clock } from './clock.js';
import type { DbExec } from './context.js';
import { hashToken, newSessionToken } from './crypto.js';
import { DEFAULT_RUNTIME_POLICY } from './policy.js';

export const SESSION_COOKIE = 'keel_session';
export const NORMAL_TTL_MS = DEFAULT_RUNTIME_POLICY.sessionTtlMs;
export const REMEMBER_TTL_MS = DEFAULT_RUNTIME_POLICY.sessionRememberTtlMs;
/** 绝对过期上限：createdAt 起算，滑动续期不可越过 */
export const ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 滑动续期阈值：窗口消耗过半才续，避免每次请求都写库 */
const RENEW_RATIO = 0.5;

/** 有效仅指会话期限与吊销状态，不代表最近在线；主体资格仍由 PrincipalLoader 校验。 */
export function effectiveSessions(now: Date) {
  return and(
    isNull(sessions.revokedAt),
    gt(sessions.expiresAt, now),
    gt(sessions.createdAt, new Date(now.getTime() - ABSOLUTE_TTL_MS)),
  );
}

export async function effectiveSessionSummary(db: DbExec, now: Date) {
  const [row] = await db
    .select({ count: count(), users: countDistinct(sessions.userId) })
    .from(sessions)
    .where(effectiveSessions(now));
  return row ?? { count: 0, users: 0 };
}

export interface SessionRow {
  id: string;
  principal: string;
  userId: string;
  kind: string;
  impersonatorUserId: string | null;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface IssueArgs {
  principal: string;
  userId: string;
  rememberMe: boolean;
  ip: string | null;
  ua: string | null;
  /** 缺省用默认策略；请求路径由 ctx.policy 传入实际配置。 */
  ttlMs?: { normal: number; remember: number };
}

/** 签发：返回的原始 token 只进 Cookie，调用方不得落库/落日志 */
export async function issue(
  db: DbExec,
  clock: Clock,
  args: IssueArgs,
): Promise<{ token: string; sessionId: string }> {
  const token = newSessionToken();
  const id = hashToken(token);
  const now = clock.now();
  const ttl = args.rememberMe
    ? (args.ttlMs?.remember ?? REMEMBER_TTL_MS)
    : (args.ttlMs?.normal ?? NORMAL_TTL_MS);
  await db.insert(sessions).values({
    id,
    principal: args.principal,
    userId: args.userId,
    kind: 'normal',
    impersonatorUserId: null,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: new Date(now.getTime() + ttl),
    revokedAt: null,
    ip: args.ip,
    ua: args.ua,
  });
  return { token, sessionId: id };
}

/**
 * 解析：无 cookie / token 不匹配 / 已吊销 / 已过期——四种一律返回 null，
 * 调用方统一抛 session.invalid（不泄漏存在性差异）。命中则做滑动续期。
 */
export async function resolve(db: DbExec, clock: Clock, rawToken: string): Promise<SessionRow | null> {
  const id = hashToken(rawToken);
  const now = clock.now();
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), effectiveSessions(now)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const absoluteDeadline = row.createdAt.getTime() + ABSOLUTE_TTL_MS;

  const windowMs = row.expiresAt.getTime() - row.lastActiveAt.getTime();
  const elapsed = now.getTime() - row.lastActiveAt.getTime();
  if (windowMs > 0 && elapsed >= windowMs * RENEW_RATIO) {
    const nextExpires = new Date(Math.min(now.getTime() + windowMs, absoluteDeadline));
    await db.update(sessions).set({ lastActiveAt: now, expiresAt: nextExpires }).where(eq(sessions.id, id));
    return { ...row, lastActiveAt: now, expiresAt: nextExpires };
  }
  return row;
}

export async function revoke(db: DbExec, clock: Clock, sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: clock.now() })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

export async function revokeByUser(db: DbExec, clock: Clock, userId: string): Promise<number> {
  const rows = await db
    .update(sessions)
    .set({ revokedAt: clock.now() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });
  return rows.length;
}

export async function purgeExpired(db: DbExec, clock: Clock): Promise<number> {
  const now = clock.now();
  const rows = await db
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, now), sql`${sessions.revokedAt} IS NOT NULL`))
    .returning({ id: sessions.id });
  return rows.length;
}

/** 本人会话管理只暴露独立publicId；凭据hash不进入查询投影。 */
export async function listOwnedSessions(
  db: DbExec,
  clock: Clock,
  owner: { userId: string; principal: string; currentSessionId: string | null },
) {
  const now = clock.now();
  return db
    .select({
      handle: sessions.publicId,
      current: sql<boolean>`coalesce(${sessions.id} = ${owner.currentSessionId}, false)`,
      ip: sessions.ip,
      ua: sessions.ua,
      createdAt: sessions.createdAt,
      lastActiveAt: sessions.lastActiveAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(
      and(eq(sessions.userId, owner.userId), eq(sessions.principal, owner.principal), effectiveSessions(now)),
    )
    .orderBy(sql`${sessions.createdAt} desc`, sessions.publicId);
}

/** 句柄始终与主体归属相交；不存在、越权、过期和已撤销统一空结果。 */
export async function revokeOwnedSession(
  db: DbExec,
  clock: Clock,
  owner: { userId: string; principal: string; currentSessionId: string | null },
  handle: string,
) {
  const now = clock.now();
  const [revoked] = await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(sessions.publicId, handle),
        eq(sessions.userId, owner.userId),
        eq(sessions.principal, owner.principal),
        effectiveSessions(now),
      ),
    )
    .returning({ current: sql<boolean>`coalesce(${sessions.id} = ${owner.currentSessionId}, false)` });
  return revoked;
}

export async function cleanupExpiredSessions(db: DbExec, clock: Clock): Promise<number> {
  const now = clock.now();
  const rows = await db
    .delete(sessions)
    .where(
      or(lte(sessions.expiresAt, now), lte(sessions.createdAt, new Date(now.getTime() - ABSOLUTE_TTL_MS))),
    )
    .returning({ id: sessions.id });
  return rows.length;
}
