import * as z from 'zod';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, BizError } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { runCommand } from '../../../kernel/command.js';
import { eq } from 'drizzle-orm';
import { VersionedDictSchema } from '../contract.js';
import { dictItems } from '../schema.js';
import { itemView, lockType, readItem } from '../store.js';

const definition = {
  route: { method: 'DELETE', path: '/dicts/items/{id}', summary: '删除字典项' },
  meta: { perm: DICT_PERMS.delete },
} satisfies SliceDefinition;

const inputSchema = VersionedDictSchema;
const outputSchema = z.object({ id: z.uuid() });
const errors = { ...commonErrorContracts, ...dictErrors };

export const deleteItem = sensitiveProc
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
      if (target.builtin) throw new BizError('dict.builtin_protected');
      if (target.version !== input.version) throw new BizError('dict.version_conflict');
      await tx.db.delete(dictItems).where(eq(dictItems.id, input.id));

      ctx.audit.capture({
        objectType: 'dict_item',
        objectId: input.id,
        before: itemView(target),
        after: null,
      });

      return outputSchema.parse({ id: input.id });
    });
  });
