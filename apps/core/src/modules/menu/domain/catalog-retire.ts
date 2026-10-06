import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import * as z from 'zod';
import type { TxExec } from '../../../kernel/context.js';
import { menus } from '../schema.js';

const retiredItemSchema = z
  .object({
    sourceKey: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();
const retiredDocument = z
  .object({ version: z.literal(1), items: z.array(retiredItemSchema), digest: z.string() })
  .strict();

export const EMPTY_RETIRED_DOCUMENT = {
  version: 1 as const,
  items: [] as { sourceKey: string; reason: string }[],
  digest: createHash('sha256')
    .update(JSON.stringify({ version: 1, items: [] }))
    .digest('hex'),
};

export function readRetiredCatalog(retiredInput: unknown) {
  const document = z
    .object({ version: z.literal(1), items: z.array(z.unknown()), digest: z.string() })
    .strict()
    .parse(retiredInput);
  const digest = createHash('sha256')
    .update(JSON.stringify({ version: document.version, items: document.items }))
    .digest('hex');
  if (digest !== document.digest) throw new Error('permission catalog digest mismatch');
  const retired = retiredDocument.parse(retiredInput);
  const seen = new Set<string>();
  for (const item of retired.items) {
    if (seen.has(item.sourceKey)) throw new Error(`duplicate retired identity: ${item.sourceKey}`);
    seen.add(item.sourceKey);
    if (!item.sourceKey.includes('#action:'))
      throw new Error(`retired identity is not action: ${item.sourceKey}`);
  }
  return retired.items;
}

export async function retireCatalogActions(
  tx: TxExec,
  byIdentity: Map<string, { id: string; type: string }>,
  desired: ReadonlySet<string>,
  retired: readonly { sourceKey: string }[],
  removeRoleGrants: (tx: TxExec, menuId: string) => Promise<void>,
) {
  const retiredKeys = new Set(retired.map((item) => item.sourceKey));
  for (const key of retiredKeys) {
    if (desired.has(key)) throw new Error(`retired identity still grantable: ${key}`);
    const current = byIdentity.get(key);
    if (current && current.type !== 'action') throw new Error(`retired identity is not action: ${key}`);
  }
  for (const key of byIdentity.keys()) {
    if (desired.has(key)) continue;
    if (!retiredKeys.has(key))
      throw new Error(`catalog identity removed; explicit migration required: ${key}`);
  }
  const deletedIds = new Set<string>();
  for (const key of retiredKeys) {
    const current = byIdentity.get(key);
    if (!current) continue;
    await removeRoleGrants(tx, current.id);
    await tx.delete(menus).where(eq(menus.id, current.id));
    deletedIds.add(current.id);
    byIdentity.delete(key);
  }
  return deletedIds;
}
