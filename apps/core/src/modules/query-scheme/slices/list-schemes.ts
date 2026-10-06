import { asc } from 'drizzle-orm';
import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { QuerySchemePageSchema, SchemeResourceSchema } from '../contract.js';
import { readableScheme, schemeView } from '../domain/schemes.js';
import { authorizeSchemeResource } from '../resources.js';
import { querySchemes } from '../schema.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { querySchemeErrors } from '../errors.js';

const definition = {
  route: { method: 'GET', path: '/query-schemes/{resource}', summary: '个人与共享用户查询方案' },
  meta: { perm: 'none', permNoneReason: '公共方案按 resource 登记的业务权限校验，归属仍限制为当前用户。' },
} satisfies SliceDefinition;

const inputSchema = z.object({ resource: SchemeResourceSchema }).strict();

const outputSchema = QuerySchemePageSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(querySchemeErrors, [
    'query_scheme.resource_invalid',
    'query_scheme.not_found',
    'query_scheme.name_conflict',
  ]),
};

export const listSchemes = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    authorizeSchemeResource(ctx, input.resource);

    const list = (
      await ctx.db
        .select()
        .from(querySchemes)
        .where(readableScheme(ctx.userId, input.resource))
        .orderBy(asc(querySchemes.name))
    ).map((row) => schemeView(ctx, row));
    // 形状与其他列表统一；方案总量受归属约束天然很小，暂不真分页。
    const result = { list, total: list.length, page: 1, pageSize: list.length };
    return result;
  });
