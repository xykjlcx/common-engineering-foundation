import { and, eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { SchemeResourceSchema } from '../contract.js';
import { ownScheme } from '../domain/schemes.js';
import { authorizeSchemeResource } from '../resources.js';
import { querySchemes } from '../schema.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { querySchemeErrors } from '../errors.js';

const definition = {
  route: { method: 'DELETE', path: '/query-schemes/{resource}/{id}', summary: '删除自己的查询方案' },
  meta: { perm: 'none', permNoneReason: '公共方案按 resource 登记的业务权限校验，归属仍限制为当前用户。' },
} satisfies SliceDefinition;

const inputSchema = z
  .object({ resource: SchemeResourceSchema, id: z.uuid(), version: z.number().int().min(0) })
  .strict();

const outputSchema = z.object({ deleted: z.boolean() });

const errors = {
  ...commonErrorContracts,
  ...pick(querySchemeErrors, [
    'query_scheme.resource_invalid',
    'query_scheme.not_found',
    'query_scheme.name_conflict',
    'query_scheme.sharing_forbidden',
    'query_scheme.version_conflict',
  ]),
};

export const deleteScheme = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    authorizeSchemeResource(ctx, input.resource);

    await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      await ownScheme(ctx, tx, input.id, input.version, input.resource);
      const rows = await tx
        .delete(querySchemes)
        .where(
          and(
            eq(querySchemes.id, input.id),
            eq(querySchemes.resource, input.resource),
            eq(querySchemes.ownerId, ctx.userId),
            eq(querySchemes.version, input.version),
          ),
        )
        .returning({ id: querySchemes.id });
      if (!rows.length) throw new BizError('query_scheme.version_conflict');
    });

    ctx.audit.capture({ objectType: 'queryScheme', objectId: input.id, after: { deleted: true } });
    return { deleted: true };
  });
