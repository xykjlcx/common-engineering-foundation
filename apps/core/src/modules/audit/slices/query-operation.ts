import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { AUDIT_PERMS } from '../permissions.js';
import * as z from 'zod';
import { and, desc, eq, ne } from 'drizzle-orm';
import { auditLogs } from '../../../schema/index.js';
import { BizError } from '../../../kernel/errors.js';
import { auditErrors } from '../errors.js';
import { OperationDetailSchema } from '../contract.js';
import { operationColumns, operationViews } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/audit/operations/{id}', summary: '操作详情和同请求其他记录' },
  meta: { perm: AUDIT_PERMS.logView },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid() });
const outputSchema = OperationDetailSchema;
const errors = { ...commonErrorContracts, ...auditErrors };

export const queryOperation = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：audit_log 非归属敏感表，读接口不改写已脱敏的前后值。
    const [row] = await ctx.db
      .select({ ...operationColumns, before: auditLogs.before, after: auditLogs.after })
      .from(auditLogs)
      .where(eq(auditLogs.id, input.id))
      .limit(1);

    if (!row) throw new BizError('audit.not_found');

    const related = row.traceId
      ? await ctx.db
          .select(operationColumns)
          .from(auditLogs)
          .where(and(eq(auditLogs.traceId, row.traceId), ne(auditLogs.id, row.id)))
          .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
          .limit(50)
      : [];

    const { before, after, ...entry } = row;
    const [detail] = await operationViews(ctx.db, [entry]);

    return outputSchema.parse({ ...detail, before, after, related: await operationViews(ctx.db, related) });
  });
