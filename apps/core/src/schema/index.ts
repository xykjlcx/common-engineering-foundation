import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { enumCheck } from './check.js';

export const SESSION_PRINCIPALS = ['user', 'platform'] as const;
/** 会话类型：impersonation = 代入登录（审计 isImpersonation 标记源） */
export const SESSION_KINDS = ['normal', 'impersonation'] as const;

export const AUDIT_OUTCOMES = ['success', 'denied', 'failure'] as const;

export const OUTBOX_EVENT_STATUSES = ['pending', 'dispatched', 'dead'] as const;

/** PG 服务端会话：id = token 的 SHA-256（库里绝不存原始 token） */
export const sessions = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    publicId: uuid('public_id').notNull().unique().defaultRandom(),

    principal: text('principal').notNull().default('user'),
    userId: text('user_id').notNull(),

    kind: text('kind').notNull().default('normal'),
    impersonatorUserId: text('impersonator_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true, mode: 'date' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    ip: text('ip'),
    ua: text('ua'),
  },
  (t) => [
    index('session_user_idx').on(t.userId),
    index('session_expires_idx').on(t.expiresAt),
    check('session_principal_check', enumCheck(t.principal, SESSION_PRINCIPALS)),
    check('session_kind_check', enumCheck(t.kind, SESSION_KINDS)),
  ],
);

export const auditLogs = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey(),
    actorUserId: text('actor_user_id'),
    sessionId: text('session_id'),
    isImpersonation: boolean('is_impersonation').notNull().default(false),
    action: text('action').notNull(),
    outcome: text('outcome').notNull().default('success'),
    errorCode: text('error_code'),
    objectType: text('object_type'),
    objectId: text('object_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: text('ip'),

    traceId: text('trace_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    index('audit_created_idx').on(t.createdAt),
    index('audit_action_idx').on(t.action),
    index('audit_actor_time_idx').on(t.actorUserId, t.createdAt),
    check('audit_log_outcome_check', enumCheck(t.outcome, AUDIT_OUTCOMES)),
  ],
);

export const outboxEvents = pgTable(
  'outbox_event',
  {
    id: uuid('id').primaryKey(),
    topic: text('topic').notNull(),
    payload: jsonb('payload').notNull(),

    status: text('status').$type<(typeof OUTBOX_EVENT_STATUSES)[number]>().notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'date' }).notNull(),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    index('outbox_due_idx').on(t.status, t.nextAttemptAt),
    check('outbox_event_status_check', enumCheck(t.status, OUTBOX_EVENT_STATUSES)),
  ],
);
