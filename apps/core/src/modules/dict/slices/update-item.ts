import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, BizError } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { runCommand } from '../../../kernel/command.js';
import { eq, sql } from 'drizzle-orm';
import { UpdateDictItemSchema, DictItemViewSchema } from '../contract.js';
import { dictItems } from '../schema.js';
import { clearPreviousDefault, itemView, lockType, readItem } from '../store.js';

const definition = {
  route: { method: 'PATCH', path: '/dicts/items/{id}', summary: '编辑字典项' },
  meta: { perm: DICT_PERMS.update },
} satisfies SliceDefinition;

const inputSchema = UpdateDictItemSchema;
const outputSchema = DictItemViewSchema;
const errors = { ...commonErrorContracts, ...dictErrors };

export const updateItem = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return runCommand(ctx, async (tx) => {
      const ref = await readItem(tx.db, input.id);
      await lockType(tx.db, ref.typeId);
      const target = await readItem(tx.db, input.id);
      if (target.version !== input.version) throw new BizError('dict.version_conflict');

      if (
        target.builtin &&
        ((input.remark !== undefined && input.remark !== target.remark) ||
          (input.isDefault !== undefined && input.isDefault !== target.isDefault))
      )
        throw new BizError('dict.builtin_protected');

      if (input.isDefault) await clearPreviousDefault(tx, target.typeId, input.id);
      const { id, version: _version, ...patch } = input;

      const [row] = await tx.db
        .update(dictItems)
        .set({ ...patch, version: sql`${dictItems.version} + 1`, updatedAt: ctx.clock.now() })
        .where(eq(dictItems.id, id))
        .returning();

      if (!row) throw new BizError('dict.not_found');
      const result = itemView(row);
      ctx.audit.capture({ objectType: 'dict_item', objectId: id, before: itemView(target), after: result });

      return outputSchema.parse(result);
    });
  });
