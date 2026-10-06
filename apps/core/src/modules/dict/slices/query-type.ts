import * as z from 'zod';
import { eq } from 'drizzle-orm';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BizError, commonErrorContracts } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { DictTypeViewSchema } from '../contract.js';
import { dictTypes } from '../schema.js';
import { typeView } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/dicts/types/{id}', summary: '读取字典详情' },
  meta: { perm: DICT_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid() }).strict();
const outputSchema = DictTypeViewSchema;
const errors = { ...commonErrorContracts, ...dictErrors };

export const queryType = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [row] = await ctx.db.select().from(dictTypes).where(eq(dictTypes.id, input.id));
    if (!row) throw new BizError('dict.not_found');

    return typeView(row);
  });
