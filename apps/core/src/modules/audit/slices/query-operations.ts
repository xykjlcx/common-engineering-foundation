import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { AUDIT_PERMS } from '../permissions.js';
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { auditLogs } from '../../../schema/index.js';
import { OperationQuerySchema, OperationPageSchema } from '../contract.js';
import { operationColumns, operationViews } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/audit/operations', summary: '全站操作日志' },
  meta: { perm: AUDIT_PERMS.logView },
} satisfies SliceDefinition;

const inputSchema = OperationQuerySchema;
const outputSchema = OperationPageSchema;
const errors = commonErrorContracts;

export const queryOperations = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：audit_log 为全站审计事实，权限独立于组织数据范围。
    const prefix = input.actionPrefix?.replace(/[\\%_]/g, '\\$&');

    const where = and(
      gte(auditLogs.createdAt, new Date(input.from)),
      lt(auditLogs.createdAt, new Date(input.to)),
      input.actorId ? eq(auditLogs.actorUserId, input.actorId) : undefined,
      input.actionPrefix ? sql`${auditLogs.action} like ${`${prefix}%`} escape '\\'` : undefined,
      input.outcome ? eq(auditLogs.outcome, input.outcome) : undefined,
      input.objectType ? eq(auditLogs.objectType, input.objectType) : undefined,
      input.objectId ? eq(auditLogs.objectId, input.objectId) : undefined,
      input.traceId ? eq(auditLogs.traceId, input.traceId) : undefined,
    );

    const [rows, totals] = await Promise.all([
      ctx.db
        .select(operationColumns)
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      ctx.db.select({ total: count() }).from(auditLogs).where(where),
    ]);

    return outputSchema.parse({
      list: await operationViews(ctx.db, rows),
      total: totals[0]?.total ?? 0,
      page: input.page,
      pageSize: input.pageSize,
    });
  });
