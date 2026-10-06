import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, BizError } from '../../../kernel/errors.js';
import { DICT_PERMS } from '../permissions.js';
import { dictErrors } from '../errors.js';
import { runCommand } from '../../../kernel/command.js';
import { eq, sql } from 'drizzle-orm';
import { UpdateDictTypeSchema, DictTypeViewSchema } from '../contract.js';
import { dictTypes } from '../schema.js';
import { lockType, typeView } from '../store.js';

const definition = {
  route: { method: 'PATCH', path: '/dicts/types/{id}', summary: '编辑字典类型' },
  meta: { perm: DICT_PERMS.update },
} satisfies SliceDefinition;

const inputSchema = UpdateDictTypeSchema;
const outputSchema = DictTypeViewSchema;
const errors = { ...commonErrorContracts, ...dictErrors };

export const updateType = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return runCommand(ctx, async (tx) => {
      const target = await lockType(tx.db, input.id);
      if (target.version !== input.version) throw new BizError('dict.version_conflict');
      const { id, version: _version, ...patch } = input;

      const [row] = await tx.db
        .update(dictTypes)
        .set({ ...patch, version: sql`${dictTypes.version} + 1`, updatedAt: ctx.clock.now() })
        .where(eq(dictTypes.id, id))
        .returning();

      if (!row) throw new BizError('dict.not_found');
      const result = typeView(row);
      ctx.audit.capture({ objectType: 'dict_type', objectId: id, before: typeView(target), after: result });

      return outputSchema.parse(result);
    });
  });
