import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { CreateSchemeSchema, QuerySchemeSchema } from '../contract.js';
import { assertSchemeSharing, schemeView, schemeWriteError } from '../domain/schemes.js';
import { authorizeSchemeResource, validateSchemeFilters } from '../resources.js';
import { querySchemes } from '../schema.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { querySchemeErrors } from '../errors.js';

const definition = {
  route: { method: 'POST', path: '/query-schemes/{resource}', summary: '保存用户查询方案' },
  meta: { perm: 'none', permNoneReason: '公共方案按 resource 登记的业务权限校验，归属仍限制为当前用户。' },
} satisfies SliceDefinition;

const inputSchema = CreateSchemeSchema;

const outputSchema = QuerySchemeSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(querySchemeErrors, [
    'query_scheme.resource_invalid',
    'query_scheme.not_found',
    'query_scheme.name_conflict',
    'query_scheme.sharing_forbidden',
  ]),
};

export const createScheme = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const resource = authorizeSchemeResource(ctx, input.resource);
    validateSchemeFilters(resource, input.filters);

    assertSchemeSharing(ctx, input.scope);
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      const [row] = await tx
        .insert(querySchemes)
        .values({
          ...input,
          id: ctx.idgen(),
          ownerId: ctx.userId,
          version: 0,
          createdAt: ctx.clock.now(),
          updatedAt: ctx.clock.now(),
        })
        .returning()
        .catch(schemeWriteError);
      if (!row) throw new Error('scheme insert returned no row');
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse(schemeView(ctx, row));
    });

    ctx.audit.capture({
      objectType: 'queryScheme',
      objectId: result.id,
      after: { name: result.name, scope: result.scope },
    });
    return result;
  });
