import type { DbExec } from '../../../kernel/context.js';
import { BizError } from '../../../kernel/errors.js';
import { MenuTypeSchema } from '../schema.js';
import { listMenus, selectExistingMenuIds, selectPermCodesOfMenus } from '../store.js';

/** 角色授权面只读目录；调用方负责 iam:role:grant 与操作者可授权限的过滤。 */
export async function getGrantMenuCatalog(db: DbExec) {
  const rows = await listMenus(db);
  return rows.map((row) => ({
    id: row.id,
    parentId: row.parentId,
    label: row.label,
    type: MenuTypeSchema.parse(row.type),
    permCode: row.permCode,
  }));
}

// 导出表只用于外键与只读查询，写入由本模块负责。

/** 空集合表示清空授权；缺失节点按稳定顺序报告。 */
export async function assertMenusExist(db: DbExec, menuIds: readonly string[]): Promise<void> {
  const wanted = [...new Set(menuIds)];
  if (wanted.length === 0) return;
  const rows = await selectExistingMenuIds(db, wanted);
  const found = new Set(rows.map((r) => r.id));
  const missing = wanted.filter((id) => !found.has(id)).sort();
  if (missing.length > 0) throw new BizError('menu.not_found', { missing });
}

/** 显隐与节点类型不影响发码；不存在的节点忽略，存在性检查由调用方单独执行。 */
export async function getPermCodesOfMenus(db: DbExec, menuIds: readonly string[]): Promise<string[]> {
  const wanted = [...new Set(menuIds)];
  if (wanted.length === 0) return [];
  const rows = await selectPermCodesOfMenus(db, wanted);
  const codes = new Set<string>();
  for (const row of rows) {
    if (row.permCode !== null && row.permCode !== '') codes.add(row.permCode);
  }
  return [...codes].sort();
}
