import type { DbExec } from '../../../kernel/context.js';
import { countUsersOfDepartments, getDepartmentLeaderReferences } from '../../user/api.js';
import { getDepartments } from './dept-access.js';
import { organizationContext } from './organization.js';

/** 管理视图按当前用户事实计算，直属人数排除注销；不展开下级。 */
export async function getDepartmentViews(db: DbExec, id?: string) {
  const all = await getDepartments(db);
  const rows = id ? all.filter((row) => row.id === id) : all;
  const [counts, leaders] = await Promise.all([
    countUsersOfDepartments(
      db,
      all.map((row) => row.id),
    ),
    getDepartmentLeaderReferences(db, [
      ...new Set(rows.flatMap((row) => (row.leaderId ? [row.leaderId] : []))),
    ]),
  ]);
  const names = new Map(leaders.map((leader) => [leader.id, leader.name]));
  const byId = new Map(all.map((row) => [row.id, row]));
  const totals = new Map<string, number>();
  for (const row of all) {
    const seen = new Set<string>();
    let node: typeof row | undefined = row;
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      totals.set(node.id, (totals.get(node.id) ?? 0) + (counts.get(row.id) ?? 0));
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
  }
  return rows.map((row) => ({
    ...row,
    ...organizationContext(all, row.id),
    memberCount: counts.get(row.id) ?? 0,
    memberCountWithSub: totals.get(row.id) ?? 0,
    leaderName: row.leaderId ? (names.get(row.leaderId) ?? null) : null,
  }));
}
