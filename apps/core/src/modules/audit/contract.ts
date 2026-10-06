import * as z from 'zod';

// 时间区间采用 UTC，包含 from、不包含 to，最长 90 × 24 小时。
export const AuditRangeSchema = z.object({ from: z.iso.datetime(), to: z.iso.datetime() }).refine(
  ({ from, to }) => {
    const span = Date.parse(to) - Date.parse(from);
    return span > 0 && span <= 90 * 24 * 60 * 60 * 1000;
  },
  { message: '时间范围须大于0且不超过90天', path: ['to'] },
);

const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
};

export const OperationQuerySchema = AuditRangeSchema.safeExtend({
  ...pageFields,
  actorId: z.string().max(128).optional(),
  actionPrefix: z.string().max(128).optional(),
  outcome: z.enum(['success', 'denied', 'failure']).optional(),
  objectType: z.string().max(128).optional(),
  objectId: z.string().max(128).optional(),
  traceId: z.string().max(128).optional(),
});

export const LoginQuerySchema = AuditRangeSchema.safeExtend({
  ...pageFields,
  username: z.string().max(128).optional(),
  outcome: z.enum(['success', 'failure', 'locked']).optional(),
  ip: z.string().max(128).optional(),
});

export const OperationSchema = z
  .object({
    id: z.uuid(),
    actorUserId: z.string().nullable(),
    actorName: z.string(),
    isImpersonation: z.boolean(),
    action: z.string(),
    outcome: z.enum(['success', 'denied', 'failure']),
    errorCode: z.string().nullable(),
    objectType: z.string().nullable(),
    objectId: z.string().nullable(),
    ip: z.string().nullable(),
    traceId: z.string().nullable(),
    createdAt: z.iso.datetime(),
  })
  .strict();

const pagination = {
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
};

export const OperationPageSchema = z.object({ list: z.array(OperationSchema), ...pagination }).strict();

export const OperationDetailSchema = OperationSchema.extend({
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  related: z.array(OperationSchema).max(50),
}).strict();

export const LoginSchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
    userId: z.uuid().nullable(),
    outcome: z.enum(['success', 'failure', 'locked']),
    reason: z.string().nullable(),
    ip: z.string().nullable(),
    ua: z.string().nullable(),
    occurredAt: z.iso.datetime(),
  })
  .strict();

export const LoginPageSchema = z.object({ list: z.array(LoginSchema), ...pagination }).strict();
export const AuditEntrySchema = z.object({ tabs: z.array(z.enum(['oplog', 'login', 'sessions'])) }).strict();

export const SessionQuerySchema = z
  .object({ ...pageFields, keyword: z.string().max(128).optional() })
  .strict();

export const OnlineSessionSchema = z
  .object({
    handle: z.uuid(),
    current: z.boolean(),
    userName: z.string(),
    employeeNo: z.string().nullable(),
    kind: z.enum(['normal', 'impersonation']),
    impersonatorName: z.string().nullable(),
    createdAt: z.iso.datetime(),
    lastActiveAt: z.iso.datetime().describe('会话签发或最近续期时间，不逐请求更新'),
    ip: z.string().nullable(),
    ua: z.string().nullable(),
  })
  .strict();

export const OnlineSessionPageSchema = z
  .object({ list: z.array(OnlineSessionSchema), ...pagination, onlyOwn: z.boolean() })
  .strict();
