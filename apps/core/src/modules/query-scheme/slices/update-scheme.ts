import { and, eq } from 'drizzle-orm';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { QuerySchemeSchema, UpdateSchemeSchema } from '../contract.js';
import { ownScheme, schemeView, schemeWriteError } from '../domain/schemes.js';
import { authorizeSchemeResource, validateSchemeFilters } from '../resources.js';
import { querySchemes } from '../schema.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { querySchemeErrors } from '../errors.js';

const definition = {
  route: { method: 'PATCH', path: '/query-schemes/{resource}/{id}', summary: '更新自己的查询方案' },
  meta: { perm: 'none', permNoneReason: '公共方案按 resource 登记的业务权限校验，归属仍限制为当前用户。' },
} satisfies SliceDefinition;

const inputSchema = UpdateSchemeSchema;

const outputSchema = QuerySchemeSchema;

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

export const updateScheme = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const resource = authorizeSchemeResource(ctx, input.resource);
    if (input.filters !== undefined) validateSchemeFilters(resource, input.filters);

    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      await ownScheme(ctx, tx, input.id, input.version, input.resource);
      const [row] = await tx
        .update(querySchemes)
        .set({
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.filters === undefined ? {} : { filters: input.filters }),
          version: input.version + 1,
          updatedAt: ctx.clock.now(),
        })
        .where(
          and(
            eq(querySchemes.id, input.id),
            eq(querySchemes.resource, input.resource),
            eq(querySchemes.ownerId, ctx.userId),
            eq(querySchemes.version, input.version),
          ),
        )
        .returning()
        .catch(schemeWriteError);
      if (!row) throw new BizError('query_scheme.version_conflict');
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse(schemeView(ctx, row));
    });

    ctx.audit.capture({ objectType: 'queryScheme', objectId: result.id, after: { name: result.name } });
    return result;
  });
