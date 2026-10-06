import { eq } from 'drizzle-orm';
import type { TxExec } from '../../../kernel/context.js';
import { roleMenus } from '../schema.js';

/** 仅供目录维护：与节点退役共用事务，不改变在线授权的版本与权限语义。 */
export async function removeGrantsForRetiredMenu(tx: TxExec, menuId: string): Promise<void> {
  await tx.delete(roleMenus).where(eq(roleMenus.menuId, menuId));
}
