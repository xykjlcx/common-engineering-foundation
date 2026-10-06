import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { dictErrors } from '../errors.js';
import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import { DictItemViewSchema } from '../contract.js';
import { dictItems, dictTypes } from '../schema.js';
import { itemView } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/dicts/options', summary: '启用字典选项' },
  meta: { perm: 'none', permNoneReason: '启用字典选项用于登录用户表单展示，不含归属数据' },
} satisfies SliceDefinition;

const inputSchema = z.object({ code: z.string().min(1).max(48) }).strict();
const outputSchema = z.array(DictItemViewSchema);
const errors = { ...commonErrorContracts, ...dictErrors };

export const queryOptions = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const rows = await ctx.db
      .select(getTableColumns(dictItems))
      .from(dictItems)
      .innerJoin(dictTypes, eq(dictTypes.id, dictItems.typeId))
      .where(and(eq(dictTypes.code, input.code), eq(dictTypes.enabled, true), eq(dictItems.enabled, true)))
      .orderBy(asc(dictItems.sort), asc(dictItems.value), asc(dictItems.id));

    return rows.map(itemView);
  });
