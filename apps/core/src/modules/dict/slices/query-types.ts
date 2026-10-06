import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { asc } from 'drizzle-orm';
import { DictTypeViewSchema } from '../contract.js';
import { dictTypes } from '../schema.js';
import { typeView } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/dicts/types', summary: '字典类型列表' },
  meta: { perm: DICT_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();
const outputSchema = z.array(DictTypeViewSchema);
const errors = { ...commonErrorContracts, ...dictErrors };

export const queryTypes = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    return (await ctx.db.select().from(dictTypes).orderBy(asc(dictTypes.code), asc(dictTypes.id))).map(
      typeView,
    );
  });
