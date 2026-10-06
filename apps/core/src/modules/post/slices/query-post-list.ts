import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, kernelErrors } from '../../../kernel/errors.js';
import { POST_PERMS } from '../permissions.js';
import { postErrors } from '../errors.js';
import { and, asc, count, sql, eq, ilike, or } from 'drizzle-orm';
import { PostsQuerySchema, PostPageSchema, resolvePostFilters } from '../contract.js';
import { posts } from '../schema.js';
import { postViews } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/posts', summary: '岗位列表' },
  meta: { perm: POST_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = PostsQuerySchema;
const outputSchema = PostPageSchema;
const errors = { ...commonErrorContracts, ...postErrors, ...kernelErrors };

export const queryPostList = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const filter = resolvePostFilters(input.filters ? JSON.parse(input.filters) : { op: 'and', items: [] });

    const where = and(
      filter.kind === 'none'
        ? sql`false`
        : filter.kind === 'value'
          ? eq(posts.enabled, filter.value)
          : undefined,
      input.keyword
        ? or(ilike(posts.name, `%${input.keyword}%`), ilike(posts.code, `%${input.keyword}%`))
        : undefined,
      input.enabled === undefined ? undefined : eq(posts.enabled, input.enabled),
    );

    const [rows, total] = await Promise.all([
      ctx.db
        .select()
        .from(posts)
        .where(where)
        .orderBy(asc(posts.sort), asc(posts.name), asc(posts.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      ctx.db.select({ value: count() }).from(posts).where(where),
    ]);

    return {
      list: await postViews(ctx.db, rows),
      total: total[0]?.value ?? 0,
      page: input.page,
      pageSize: input.pageSize,
    };
  });
