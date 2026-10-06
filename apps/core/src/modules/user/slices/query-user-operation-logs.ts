import { and, count, desc, eq, gte, lt } from 'drizzle-orm';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { auditLogs } from '../../../schema/index.js';
import { UserOperationLogPageSchema, UserOperationLogQuerySchema } from '../contract.js';
import { appUsers } from '../schema.js';
import { visibleUsers } from '../scoped.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { getAuditIdentities } from '../domain/user-access.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/users/{id}/operation-logs', summary: '用户操作记录分页' },
  meta: { perm: USER_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = UserOperationLogQuerySchema;

const outputSchema = UserOperationLogPageSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.not_found']),
};

export const queryUserOperationLogs = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [user] = await visibleUsers(ctx, { where: eq(appUsers.id, input.id) }).limit(1);
    if (!user) throw new BizError('user.not_found', { id: input.id });
    const where = and(
      eq(auditLogs.objectType, 'user'),
      eq(auditLogs.objectId, user.id),
      input.outcome ? eq(auditLogs.outcome, input.outcome) : undefined,
      input.from ? gte(auditLogs.createdAt, new Date(input.from)) : undefined,
      input.to ? lt(auditLogs.createdAt, new Date(input.to)) : undefined,
    );
    const [rows, totals] = await Promise.all([
      ctx.db
        .select({
          id: auditLogs.id,
          at: auditLogs.createdAt,
          action: auditLogs.action,
          outcome: auditLogs.outcome,
          operator: auditLogs.actorUserId,
        })
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      ctx.db.select({ total: count() }).from(auditLogs).where(where),
    ]);
    const identities = await getAuditIdentities(
      ctx.db,
      rows.map((row) => row.operator).filter((id): id is string => id !== null),
    );
    const result = UserOperationLogPageSchema.parse({
      list: rows.map((row) => ({
        ...row,
        at: row.at.toISOString(),
        operatorName: row.operator ? (identities.get(row.operator)?.name ?? null) : null,
      })),
      total: totals[0]?.total ?? 0,
      page: input.page,
      pageSize: input.pageSize,
    });
    return result;
  });
