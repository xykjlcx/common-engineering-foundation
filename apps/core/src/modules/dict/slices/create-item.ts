import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { runCommand } from '../../../kernel/command.js';
import { CreateDictItemSchema, DictItemViewSchema } from '../contract.js';
import { dictItems } from '../schema.js';
import { clearPreviousDefault, dictWriteError, itemView, lockType } from '../store.js';

const definition = {
  route: { method: 'POST', path: '/dicts/items', summary: '新建字典项' },
  meta: { perm: DICT_PERMS.create },
} satisfies SliceDefinition;

const inputSchema = CreateDictItemSchema;
const outputSchema = DictItemViewSchema;
const errors = { ...commonErrorContracts, ...dictErrors };

export const createItem = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return runCommand(ctx, async (tx) => {
      await lockType(tx.db, input.typeId);
      const id = ctx.idgen();
      const now = ctx.clock.now();
      if (input.isDefault) await clearPreviousDefault(tx, input.typeId, id);

      const [row] = await tx.db
        .insert(dictItems)
        .values({ ...input, id, createdAt: now, updatedAt: now })
        .returning()
        .catch(dictWriteError);

      if (!row) throw new Error('dict insert returned no row');
      const result = itemView(row);
      ctx.audit.capture({ objectType: 'dict_item', objectId: id, before: null, after: result });

      return outputSchema.parse(result);
    });
  });
