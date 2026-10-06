import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { runCommand } from '../../../kernel/command.js';
import { CreateDictTypeSchema, DictTypeViewSchema } from '../contract.js';
import { dictTypes } from '../schema.js';
import { dictWriteError, typeView } from '../store.js';

const definition = {
  route: { method: 'POST', path: '/dicts/types', summary: '新建字典类型' },
  meta: { perm: DICT_PERMS.create },
} satisfies SliceDefinition;

const inputSchema = CreateDictTypeSchema;
const outputSchema = DictTypeViewSchema;
const errors = { ...commonErrorContracts, ...dictErrors };

export const createType = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return runCommand(ctx, async (tx) => {
      const now = ctx.clock.now();

      const [row] = await tx.db
        .insert(dictTypes)
        .values({ ...input, id: ctx.idgen(), createdAt: now, updatedAt: now })
        .returning()
        .catch(dictWriteError);

      if (!row) throw new Error('dict insert returned no row');
      const result = typeView(row);
      ctx.audit.capture({ objectType: 'dict_type', objectId: row.id, before: null, after: result });

      return outputSchema.parse(result);
    });
  });
