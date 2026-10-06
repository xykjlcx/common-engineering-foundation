import { AUDIT_OUTCOMES, auditLogs } from '../schema/index.js';
import type { Clock } from './clock.js';
import type { DbExec } from './context.js';
import { ValidationError } from './errors.js';
import type { Logger } from './logger.js';

// 审计在 handler 提交后写入；要求强一致的敏感操作须把审计并入业务事务。

export interface AuditPatch {
  objectType?: string;
  objectId?: string;
  before?: unknown;
  after?: unknown;
}

export const AUDIT_TARGET_MAX_COUNT = 500;

export interface AuditSink {
  capture(patch: AuditPatch): void;
  /** 显式批量目标：同一请求累计最多 500 项，每个目标独立落行。 */
  captureMany(patches: readonly AuditPatch[]): void;
  readonly patch: AuditPatch;
  readonly patches: readonly AuditPatch[];
}

export function createAuditSink(): AuditSink {
  const patch: AuditPatch = {};
  const targets: AuditPatch[] = [];
  return {
    patch,
    get patches() {
      return targets.length > 0 ? targets : [patch];
    },
    captureMany(next) {
      if (targets.length + next.length > AUDIT_TARGET_MAX_COUNT) {
        throw new ValidationError('validation.failed', {
          reason: 'audit_batch_limit',
          limit: AUDIT_TARGET_MAX_COUNT,
        });
      }
      targets.push(...next.map((target) => ({ ...target })));
    },
    capture(next) {
      Object.assign(patch, next);
    },
  };
}

export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export interface AuditRecord {
  actorUserId: string | null;
  sessionId: string | null;
  isImpersonation: boolean;
  action: string;
  ip: string | null;

  traceId: string | null;
  outcome: AuditOutcome;
  /** outcome ≠ success 时的稳定错误码（errors.ts 码表） */
  errorCode: string | null;
  /** sensitiveProc 专有：无此基座的 procedure 一律不落前后值 */
  withValues: boolean;
  patch: AuditPatch;
}

const SENSITIVE_KEY_RE = /password|passwd|secret|token|credential|private_?key|hash/i;
export const AUDIT_VALUE_MAX_BYTES = 16 * 1024;

function redactEntry(key: string, value: unknown, seen: WeakSet<object>): unknown {
  // 强制改密是可审计的布尔策略，不是凭据；同名异常类型仍按敏感键遮盖。
  const policyFlag = key === 'mustChangePassword' && typeof value === 'boolean';
  return !policyFlag && SENSITIVE_KEY_RE.test(key) ? '[REDACTED]' : redact(value, seen);
}

function redact(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactEntry(k, v, seen);
  return out;
}

/**
 * 错误参数进日志前的脱敏：与审计前后值共用同一敏感键判据。
 * 错误对象的 message 里已经内联了原始 params JSON，所以诊断日志只打脱敏后的这份，
 * 绝不能把 err 本体交给序列化器。
 */
export function redactParams(params: Record<string, unknown>): Record<string, unknown> {
  const seen = new WeakSet<object>();
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) out[key] = redactEntry(key, value, seen);
  return out;
}

/** 敏感键 redact + 超限**整体**替换标记——before/after 是 jsonb 列，截断字符串会产非法 JSON */
export function sanitizeAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  const cleaned = redact(value, new WeakSet());
  const size = Buffer.byteLength(JSON.stringify(cleaned) ?? 'null');
  return size > AUDIT_VALUE_MAX_BYTES ? { _truncated: true, size } : cleaned;
}

export const QUERY_ACCESS_LOG_MSG = 'query completed';

export interface QueryAccessLog {
  /** router 路径（与审计行的 action 同口径，两条流可按同一 key 对齐） */
  procedure: string;
  userId: string;

  traceId: string;
  durationMs: number;
}

export function logQueryAccess(logger: Logger, fields: QueryAccessLog): void {
  logger.info(fields, QUERY_ACCESS_LOG_MSG);
}

export async function record(db: DbExec, clock: Clock, idgen: () => string, rec: AuditRecord): Promise<void> {
  await recordMany(db, clock, idgen, [rec]);
}

/** handler 提交后一次 INSERT；每目标单独脱敏与限长，避免整批塞入单个 patch。 */
export async function recordMany(
  db: DbExec,
  clock: Clock,
  idgen: () => string,
  records: readonly AuditRecord[],
): Promise<void> {
  if (records.length === 0) return;
  await db.insert(auditLogs).values(
    records.map((rec) => ({
      id: idgen(),
      actorUserId: rec.actorUserId,
      sessionId: rec.sessionId,
      isImpersonation: rec.isImpersonation,
      action: rec.action,
      outcome: rec.outcome,
      errorCode: rec.errorCode,
      objectType: rec.patch.objectType ?? null,
      objectId: rec.patch.objectId ?? null,
      before: rec.withValues ? sanitizeAuditValue(rec.patch.before) : null,
      after: rec.withValues ? sanitizeAuditValue(rec.patch.after) : null,
      ip: rec.ip,
      traceId: rec.traceId,
      createdAt: clock.now(),
    })),
  );
}
