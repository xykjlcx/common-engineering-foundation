import * as z from 'zod';
import { and, gte, lt, isNotNull } from 'drizzle-orm';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { auditLogs } from '../../../schema/index.js';
import { getAuditIdentities } from '../../user/api.js';
import { AUDIT_PERMS } from '../permissions.js';
import { AuditRangeSchema } from '../contract.js';

const definition = {
  route: { method: 'GET', path: '/audit/actors', summary: '所选时间内的操作人选项' },
  meta: { perm: AUDIT_PERMS.logView },
} satisfies SliceDefinition;

const inputSchema = AuditRangeSchema;
const outputSchema = z.array(z.object({ id: z.string(), name: z.string() }).strict());
const errors = commonErrorContracts;

export const queryActors = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：只从全站审计事实提取操作人，姓名经所属模块最小投影读取。
    const rows = await ctx.db
      .selectDistinct({ id: auditLogs.actorUserId })
      .from(auditLogs)
      .where(
        and(
          isNotNull(auditLogs.actorUserId),
          gte(auditLogs.createdAt, new Date(input.from)),
          lt(auditLogs.createdAt, new Date(input.to)),
        ),
      );

    const ids = rows.flatMap((row) => (row.id ? [row.id] : []));
    const identities = await getAuditIdentities(ctx.db, ids);

    return ids
      .map((id) => ({ id, name: identities.get(id)?.name ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  });
