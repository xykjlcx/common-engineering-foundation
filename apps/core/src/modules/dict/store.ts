import { and, eq, ne, sql } from 'drizzle-orm';
import type { DbExec, TxCtx } from '../../kernel/context.js';
import { BizError } from '../../kernel/errors.js';
import { PG_UNIQUE_VIOLATION, violatedConstraint } from '../../kernel/pg-error.js';
import { DictItemViewSchema, DictTypeViewSchema } from './contract.js';
import { dictItems, dictTypes } from './schema.js';

export const typeView = (row: typeof dictTypes.$inferSelect) =>
  DictTypeViewSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

export const itemView = (row: typeof dictItems.$inferSelect) =>
  DictItemViewSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

export function dictWriteError(error: unknown): never {
  const constraint = violatedConstraint(error, PG_UNIQUE_VIOLATION);
  if (constraint === 'dict_type_code_unique') throw new BizError('dict.code_conflict');
  if (constraint === 'dict_item_type_value_idx') throw new BizError('dict.value_conflict');
  throw error;
}

export async function lockType(db: DbExec, id: string) {
  const [row] = await db.select().from(dictTypes).where(eq(dictTypes.id, id)).for('update');
  if (!row) throw new BizError('dict.not_found');

  return row;
}

export async function readItem(db: DbExec, id: string) {
  const [row] = await db.select().from(dictItems).where(eq(dictItems.id, id));
  if (!row) throw new BizError('dict.not_found');

  return row;
}

export async function clearPreviousDefault(ctx: TxCtx, typeId: string, exceptId: string) {
  await ctx.db
    .update(dictItems)
    .set({ isDefault: false, version: sql`${dictItems.version} + 1`, updatedAt: ctx.clock.now() })
    .where(and(eq(dictItems.typeId, typeId), eq(dictItems.isDefault, true), ne(dictItems.id, exceptId)));
}
