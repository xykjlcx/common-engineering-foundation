import { lt, sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { Clock } from '../../kernel/clock.js';
import type { DbExec } from '../../kernel/context.js';
import { enumCheck, nullableEnumCheck } from '../../schema/check.js';

// 登录事件不关联账号外键：不存在的用户名也需留痕，日志保留期独立于账号。

export const LOGIN_OUTCOMES = ['success', 'failure', 'locked'] as const;
export type LoginOutcome = (typeof LOGIN_OUTCOMES)[number];

export const LOGIN_FAIL_REASONS = [
  'bad_credentials',
  'status_rejected',
  'account_locked',
  'ip_locked',
] as const;
export type LoginFailReason = (typeof LOGIN_FAIL_REASONS)[number];

export const loginEvents = pgTable(
  'login_event',
  {
    id: uuid('id').primaryKey(),
    /** 提交的用户名原文（账号可能不存在；锁定按 username 计数，不泄漏存在性） */
    username: text('username').notNull(),

    userId: uuid('user_id'),
    outcome: text('outcome').notNull(),
    reason: text('reason'),
    ip: text('ip'),
    ua: text('ua'),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    index('login_event_user_success_time_idx')
      .on(t.userId, t.occurredAt)
      .where(sql`${t.outcome} = 'success'`),
    index('login_event_username_time_idx').on(t.username, t.occurredAt),
    index('login_event_ip_time_idx').on(t.ip, t.occurredAt),
    index('login_event_occurred_idx').on(t.occurredAt),
    check('login_event_outcome_check', enumCheck(t.outcome, LOGIN_OUTCOMES)),

    check('login_event_reason_check', nullableEnumCheck(t.reason, LOGIN_FAIL_REASONS)),
  ],
);

/** 未认证请求也会写入登录事件，须按保留期清理。 */
export async function purgeOldLoginEvents(db: DbExec, clock: Clock, retentionMs: number): Promise<number> {
  const cutoff = new Date(clock.now().getTime() - retentionMs);
  const rows = await db
    .delete(loginEvents)
    .where(lt(loginEvents.occurredAt, cutoff))
    .returning({ id: loginEvents.id });
  return rows.length;
}
