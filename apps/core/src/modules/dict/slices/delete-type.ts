import * as z from 'zod';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, BizError } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { runCommand } from '../../../kernel/command.js';
import { eq } from 'drizzle-orm';
import { VersionedDictSchema } from '../contract.js';
import { dictTypes, dictItems } from '../schema.js';
import { lockType, typeView } from '../store.js';

const definition = {
  route: { method: 'DELETE', path: '/dicts/types/{id}', summary: '删除空字典类型' },
  meta: { perm: DICT_PERMS.delete },
} satisfies SliceDefinition;

const inputSchema = VersionedDictSchema;
const outputSchema = z.object({ id: z.uuid() });
const errors = { ...commonErrorContracts, ...dictErrors };

export const deleteType = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return runCommand(ctx, async (tx) => {
      const target = await lockType(tx.db, input.id);
      if (target.builtin) throw new BizError('dict.builtin_protected');
      if (target.version !== input.version) throw new BizError('dict.version_conflict');

      if (
        (
          await tx.db
            .select({ id: dictItems.id })
            .from(dictItems)
            .where(eq(dictItems.typeId, input.id))
            .limit(1)
        ).length
      )
        throw new BizError('dict.type_not_empty');

      await tx.db.delete(dictTypes).where(eq(dictTypes.id, input.id));

      ctx.audit.capture({
        objectType: 'dict_type',
        objectId: input.id,
        before: typeView(target),
        after: null,
      });

      return outputSchema.parse({ id: input.id });
    });
  });
