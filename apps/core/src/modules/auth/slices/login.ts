import { readSettings } from '../../settings/api.js';
import { LoginInputSchema } from '../contract.js';
import { and, count, eq, gt, max, sql } from 'drizzle-orm';
import * as z from 'zod';
import type { DbExec, PublicCtx, TxExec } from '../../../kernel/context.js';
import { publicProc } from '../../../kernel/procedures.js';
import { issue, SESSION_COOKIE } from '../../../kernel/session.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { verifyCredentials } from '../../user/api.js';
import { assertUserCanLogin, lockDecision, retryAfterSeconds } from '../domain/login-rules.js';
import { loginEvents, type LoginFailReason, type LoginOutcome } from '../schema.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { authErrors } from '../errors.js';

const definition = {
  route: { method: 'POST', path: '/auth/login', summary: '账号密码登录（签发 Cookie 会话）' },
  meta: {
    perm: 'none',
    permNoneReason: '登录是获取主体的入口，无会话可校验；防滥用由失败锁定与速率限制承担',
  },
} satisfies SliceDefinition;

const inputSchema = LoginInputSchema;

const outputSchema = z.object({
  userId: z.uuid(),
  username: z.string(),
  name: z.string(),
});

const errors = {
  ...commonErrorContracts,
  ...pick(authErrors, [
    'auth.credentials_invalid',
    'auth.rate_limited',
    'auth.user_disabled',
    'auth.user_not_effective',
  ]),
};
/** 事务内只走 tx；PGlite 单连接下使用根连接会死锁。 */
type LoginCtx = Pick<PublicCtx, 'clock' | 'idgen' | 'ip' | 'ua' | 'policy'> & {
  db: DbExec;
};
async function recordLoginEvent(
  ctx: Pick<LoginCtx, 'db' | 'clock' | 'idgen' | 'ip' | 'ua'>,
  evt: {
    username: string;
    userId: string | null;
    outcome: LoginOutcome;
    reason: LoginFailReason | null;
  },
): Promise<void> {
  await ctx.db.insert(loginEvents).values({
    id: ctx.idgen(),
    username: evt.username,
    userId: evt.userId,
    outcome: evt.outcome,
    reason: evt.reason,
    ip: ctx.ip,
    ua: ctx.ua,
    occurredAt: ctx.clock.now(),
  });
}
/** 成功登录重置账号失败计数，IP 计数不重置，避免一次撞库成功清空喷洒记录。 */
async function failureFacts(ctx: Pick<LoginCtx, 'db' | 'ip'>, windowStart: Date, username: string) {
  const badCredentials = and(eq(loginEvents.outcome, 'failure'), eq(loginEvents.reason, 'bad_credentials'));
  const [lastSuccess] = await ctx.db
    .select({ at: max(loginEvents.occurredAt) })
    .from(loginEvents)
    .where(and(eq(loginEvents.username, username), eq(loginEvents.outcome, 'success')));
  const accountStart = lastSuccess?.at && lastSuccess.at > windowStart ? lastSuccess.at : windowStart;
  const [account] = await ctx.db
    .select({ n: count(), newest: max(loginEvents.occurredAt) })
    .from(loginEvents)
    .where(and(badCredentials, eq(loginEvents.username, username), gt(loginEvents.occurredAt, accountStart)));
  const [byIp] = ctx.ip
    ? await ctx.db
        .select({ n: count(), newest: max(loginEvents.occurredAt) })
        .from(loginEvents)
        .where(and(badCredentials, eq(loginEvents.ip, ctx.ip), gt(loginEvents.occurredAt, windowStart)))
    : [{ n: 0, newest: null }];
  // 锁定记录按触发维度去重，避免未认证请求放大日志写入。
  const [accountLockedSeen] = await ctx.db
    .select({ n: count() })
    .from(loginEvents)
    .where(
      and(
        eq(loginEvents.username, username),
        eq(loginEvents.outcome, 'locked'),
        gt(loginEvents.occurredAt, windowStart),
      ),
    );
  // IP 锁定按 IP 去重，轮换用户名不能新增 locked 记录。
  const [ipLockedSeen] = ctx.ip
    ? await ctx.db
        .select({ n: count() })
        .from(loginEvents)
        .where(
          and(
            eq(loginEvents.ip, ctx.ip),
            eq(loginEvents.outcome, 'locked'),
            eq(loginEvents.reason, 'ip_locked'),
            gt(loginEvents.occurredAt, windowStart),
          ),
        )
    : [{ n: 0 }];
  const result = {
    accountFailures: account?.n ?? 0,
    accountNewest: account?.newest ?? null,
    ipFailures: byIp?.n ?? 0,
    ipNewest: byIp?.newest ?? null,
    accountLockedRecorded: (accountLockedSeen?.n ?? 0) > 0,
    ipLockedRecorded: (ipLockedSeen?.n ?? 0) > 0,
  };
  return result;
}
/** 账号判定整链含 argon2 均持事务锁，防止并发越过失败阈值。
 * IP 只做软限制，避免共享 NAT 出口串行阻塞；锁的并发效果需在多连接 PostgreSQL 验证。 */
const LOGIN_LOCK_NAMESPACE = 1;
async function lockLoginJudgement(tx: TxExec, username: string): Promise<void> {
  // 命名空间常量走 sql.raw 保持字面量：两参版 pg_advisory_xact_lock(int4, int4) 与
  // hashtext(text) 的重载解析都不依赖参数类型推断
  const ns = sql.raw(String(LOGIN_LOCK_NAMESPACE));
  await tx.execute(sql`select pg_advisory_xact_lock(${ns}, hashtext(${username}))`);
}
/** 事务内判定的产物：拒绝一律在事务外抛（抛在事务内会连同刚写的留痕行一起回滚） */
type LoginVerdict =
  | {
      kind: 'ok';
      token: string;
      user: {
        id: string;
        username: string;
        name: string;
      };
    }
  | {
      kind: 'rate_limited';
      retryAfterSeconds: number;
    }
  | {
      kind: 'bad_credentials';
    }
  | {
      kind: 'status_rejected';
      error: BizError;
    };

export const login = publicProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // 先判锁再校验凭据；判定、留痕与签发同事务，所有查询走 tx。
    const now = ctx.clock.now();
    const policy = (await readSettings(ctx.db, ctx.policy)).values.security;
    const windowStart = new Date(now.getTime() - policy.lockWindowMs);
    const verdict: LoginVerdict = await ctx.db.transaction(async (tx) => {
      await lockLoginJudgement(tx, input.username);
      const txCtx: LoginCtx = { ...ctx, db: tx };
      const facts = await failureFacts(txCtx, windowStart, input.username);
      const lock = lockDecision(facts, policy);
      if (lock) {
        const alreadyRecorded = lock === 'ip_locked' ? facts.ipLockedRecorded : facts.accountLockedRecorded;
        if (!alreadyRecorded) {
          await recordLoginEvent(txCtx, {
            username: input.username,
            userId: null,
            outcome: 'locked',
            reason: lock,
          });
        }
        const newest = lock === 'account_locked' ? facts.accountNewest : facts.ipNewest;
        const result: LoginVerdict = {
          kind: 'rate_limited',
          retryAfterSeconds: newest
            ? retryAfterSeconds(newest, now, policy.lockWindowMs)
            : Math.ceil(policy.lockWindowMs / 1000),
        };
        return result;
      }
      const user = await verifyCredentials(tx, input.username, input.password);
      if (!user) {
        await recordLoginEvent(txCtx, {
          username: input.username,
          userId: null,
          outcome: 'failure',
          reason: 'bad_credentials',
        });
        return { kind: 'bad_credentials' };
      }
      try {
        assertUserCanLogin(user, ctx.clock.now());
      } catch (e) {
        if (!(e instanceof BizError)) throw e;
        await recordLoginEvent(txCtx, {
          username: input.username,
          userId: user.id,
          outcome: 'failure',
          reason: 'status_rejected',
        });
        return { kind: 'status_rejected', error: e };
      }
      const issued = await issue(tx, ctx.clock, {
        principal: 'user',
        userId: user.id,
        rememberMe: input.rememberMe,
        ip: ctx.ip,
        ua: ctx.ua,
        ttlMs: { normal: policy.sessionTtlMs, remember: policy.sessionRememberTtlMs },
      });
      // 留痕使用归一入参，避免存量账号的大小写原文拆分成功与失败计数。
      await recordLoginEvent(txCtx, {
        username: input.username,
        userId: user.id,
        outcome: 'success',
        reason: null,
      });
      return { kind: 'ok', token: issued.token, user };
    });

    // 拒绝一律在事务外抛：抛在事务内会把刚写的 locked / failure 留痕一起回滚掉
    if (verdict.kind === 'rate_limited') {
      throw new BizError('auth.rate_limited', { retryAfterSeconds: verdict.retryAfterSeconds });
    }
    if (verdict.kind === 'bad_credentials') throw new BizError('auth.credentials_invalid');
    if (verdict.kind === 'status_rejected') throw verdict.error;
    ctx.cookies.set(
      SESSION_COOKIE,
      verdict.token,
      input.rememberMe ? { maxAgeSeconds: policy.sessionRememberTtlMs / 1000 } : {},
    );
    return { userId: verdict.user.id, username: verdict.user.username, name: verdict.user.name };
  });
