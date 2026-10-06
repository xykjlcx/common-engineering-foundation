import * as z from 'zod';
import { eq } from 'drizzle-orm';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BizError, commonErrorContracts } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { DictItemViewSchema } from '../contract.js';
import { dictItems } from '../schema.js';
import { itemView } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/dicts/items/{id}', summary: '读取字典详情' },
  meta: { perm: DICT_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid() }).strict();
const outputSchema = DictItemViewSchema;
const errors = { ...commonErrorContracts, ...dictErrors };

export const queryItem = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [row] = await ctx.db.select().from(dictItems).where(eq(dictItems.id, input.id));
    if (!row) throw new BizError('dict.not_found');

    return itemView(row);
  });
