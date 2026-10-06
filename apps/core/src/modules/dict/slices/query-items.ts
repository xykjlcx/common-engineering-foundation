import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import { DictItemsQuerySchema, DictItemPageSchema } from '../contract.js';
import { dictItems } from '../schema.js';
import { itemView } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/dicts/items', summary: '字典项分页列表' },
  meta: { perm: DICT_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = DictItemsQuerySchema;
const outputSchema = DictItemPageSchema;
const errors = { ...commonErrorContracts, ...dictErrors };

export const queryItems = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const where = and(
      eq(dictItems.typeId, input.typeId),
      input.keyword
        ? or(ilike(dictItems.label, `%${input.keyword}%`), ilike(dictItems.value, `%${input.keyword}%`))
        : undefined,
    );

    const [rows, totals] = await Promise.all([
      ctx.db
        .select()
        .from(dictItems)
        .where(where)
        .orderBy(asc(dictItems.sort), asc(dictItems.value), asc(dictItems.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      ctx.db.select({ total: count() }).from(dictItems).where(where),
    ]);

    return {
      list: rows.map(itemView),
      total: totals[0]?.total ?? 0,
      page: input.page,
      pageSize: input.pageSize,
    };
  });
