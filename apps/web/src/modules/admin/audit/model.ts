import * as z from 'zod';
import { OperationQuerySchema, LoginQuerySchema, SessionQuerySchema } from '@keel/core/audit-contract';
import type { TFunction } from 'i18next';
import type { StatusBadgeTone } from '@/components/pro/StatusBadge';
import { formatLocalDateTime } from '@/lib/datetime';
import { BizError } from '@/lib/http/errors';

/** 默认最近 7 天（含今天），按本地时区的自然日切分。 */
export function defaultAuditRange(now = new Date()) {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 7);

  return { from: from.toISOString(), to: to.toISOString() };
}

/** 审计 action 的模块前缀，与 core router 的顶层 key 一致（system 只有健康检查，不进筛选）。 */
export const AUDIT_MODULES = [
  'user',
  'role',
  'dept',
  'menu',
  'dict',
  'post',
  'auth',
  'audit',
  'profile',
  'queryScheme',
  'file',
] as const;

export const AUDIT_OUTCOMES = ['success', 'denied', 'failure'] as const;

export const auditSearchSchema = z.object({
  tab: z.enum(['oplog', 'login', 'sessions']).default('oplog'),
  op: z.object(OperationQuerySchema.shape).default({ ...defaultAuditRange(), page: 1, pageSize: 15 }),
  login: z.object(LoginQuerySchema.shape).default({ ...defaultAuditRange(), page: 1, pageSize: 15 }),
  sessions: SessionQuerySchema.default({ page: 1, pageSize: 15 }),
});

export function formatAuditTime(value: string) {
  return formatLocalDateTime(value, { seconds: true });
}

export function auditError(error: unknown, fallback: string) {
  return error instanceof BizError
    ? `${error.status === 403 ? '403 · ' : ''}${error.detail}${error.traceId ? ` · traceId: ${error.traceId}` : ''}`
    : fallback;
}

export function auditDiff(before: unknown, after: unknown) {
  const object = (value: unknown): Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value))
      : value === null
        ? {}
        : { value };

  const left = object(before),
    right = object(after);

  return [...new Set([...Object.keys(left), ...Object.keys(right)])].map((key) => ({
    key,
    before: JSON.stringify(left[key]) ?? '—',
    after: JSON.stringify(right[key]) ?? '—',
    changed: JSON.stringify(left[key]) !== JSON.stringify(right[key]),
  }));
}

/** 审计 action 形如「模块.接口」，对应 locale 中 `audit.actions.<模块>.<接口>`；不认识的形态返回 null，由界面回显原值。 */
export function auditActionLabelKey(action: string) {
  const [module, method, ...rest] = action.split('.');

  return module && method && rest.length === 0 ? `audit.actions.${module}.${method}` : null;
}

export function auditActionLabel(t: TFunction<'admin'>, action: string) {
  const key = auditActionLabelKey(action);

  return key ? t(key, { defaultValue: action }) : action;
}

export function outcomeTone(outcome: (typeof AUDIT_OUTCOMES)[number]): StatusBadgeTone {
  if (outcome === 'success') return 'success';

  return outcome === 'denied' ? 'warning' : 'danger';
}

export const operationFilterKeys = [
  'actorId',
  'actionPrefix',
  'outcome',
  'objectType',
  'objectId',
  'traceId',
] as const;

export function operationFilterRoot(
  search: z.output<typeof OperationQuerySchema>,
): import('@/components/pro/filter-builder').FilterRoot {
  return {
    op: 'and',
    items: operationFilterKeys.flatMap((key) =>
      search[key] ? [{ id: key, field: key, operator: 'eq' as const, value: search[key] }] : [],
    ),
  };
}

export function operationFilterPatch(
  root: import('@/components/pro/filter-builder').FilterRoot,
): Partial<z.output<typeof OperationQuerySchema>> {
  const patch: Partial<z.output<typeof OperationQuerySchema>> = {
    actorId: undefined,
    actionPrefix: undefined,
    outcome: undefined,
    objectType: undefined,
    objectId: undefined,
    traceId: undefined,
  };

  for (const node of root.items) {
    if (!('field' in node) || typeof node.value !== 'string') continue;
    const key = operationFilterKeys.find((key) => key === node.field);

    if (key === 'outcome') patch.outcome = OperationQuerySchema.shape.outcome.parse(node.value || undefined);
    else if (key) patch[key] = node.value || undefined;
  }

  return patch;
}

export { sessionDevice } from '@/lib/session-device';
