import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { getGlobalSessionPage } from '../../auth/api.js';
import { findAuditSubjectIds, getAuditIdentities } from '../../user/api.js';
import { AUDIT_PERMS } from '../permissions.js';
import { OnlineSessionPageSchema, SessionQuerySchema } from '../contract.js';

const definition = {
  route: { method: 'GET', path: '/audit/sessions', summary: '全站有效会话' },
  meta: { perm: AUDIT_PERMS.sessionView },
} satisfies SliceDefinition;

const inputSchema = SessionQuerySchema;
const outputSchema = OnlineSessionPageSchema;
const errors = commonErrorContracts;

export const querySessions = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const userIds = input.keyword ? await findAuditSubjectIds(ctx.db, input.keyword) : undefined;

    const page = await getGlobalSessionPage(
      ctx.db,
      ctx.clock,
      { userId: ctx.userId, currentSessionId: ctx.sessionId },
      { ...input, userIds },
    );

    const identities = await getAuditIdentities(
      ctx.db,
      page.list.flatMap((row) => [row.userId, ...(row.impersonatorUserId ? [row.impersonatorUserId] : [])]),
    );

    return outputSchema.parse({
      ...page,
      list: page.list.map(({ userId, impersonatorUserId, ...row }) => ({
        ...row,
        userName: identities.get(userId)?.name ?? userId,
        employeeNo: identities.get(userId)?.employeeNo ?? null,
        impersonatorName: impersonatorUserId
          ? (identities.get(impersonatorUserId)?.name ?? impersonatorUserId)
          : null,
        createdAt: row.createdAt.toISOString(),
        lastActiveAt: row.lastActiveAt.toISOString(),
      })),
    });
  });
