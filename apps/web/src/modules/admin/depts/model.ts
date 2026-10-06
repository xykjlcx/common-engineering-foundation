// 部门纯派生逻辑（不 import React）。users 包的部门相关计算统一从这里取，不再各写一套。
import type { DeptDto } from './api';

const DEPT_PATH_SEPARATOR = ' · ';

/** rootId 自身及其全部子孙的 id 集合（按 parentId 向下遍历，天然防环） */
export function collectDeptSubtreeIds(depts: readonly DeptDto[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, DeptDto[]>();
  for (const dept of depts) {
    if (!dept.parentId) continue;
    const siblings = childrenByParent.get(dept.parentId);
    if (siblings) siblings.push(dept);
    else childrenByParent.set(dept.parentId, [dept]);
  }

  const ids = new Set<string>();
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || ids.has(id)) continue;
    ids.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child.id);
  }
  return ids;
}

/** 从根到该部门的名称链（含自身）。板 UserList「财务部 · 总账组」= 去掉集团根节点后的链 */
function deptAncestors<TDept extends Pick<DeptDto, 'id' | 'parentId' | 'name'>>(
  depts: readonly TDept[],
  deptId: string,
): TDept[] {
  const byId = new Map(depts.map((dept) => [dept.id, dept]));
  const chain: TDept[] = [];
  const seen = new Set<string>();
  let current = byId.get(deptId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

/**
 * 部门路径文案。板上的列表/详情都省略集团根节点（「财务部 · 总账组」而非「傲翼供应链 · 财务部 · 总账组」），
 * 故默认 skipRoot=true。
 */
export function deptPathLabel(
  depts: readonly Pick<DeptDto, 'id' | 'parentId' | 'name'>[],
  deptId: string | undefined,
  options?: { skipRoot?: boolean; separator?: string },
) {
  if (!deptId) return '';
  const skipRoot = options?.skipRoot ?? true;
  const separator = options?.separator ?? DEPT_PATH_SEPARATOR;
  const chain = deptAncestors(depts, deptId);
  if (chain.length === 0) return '';
  const visible = skipRoot && chain.length > 1 && chain[0]?.parentId === null ? chain.slice(1) : chain;
  return visible.map((dept) => dept.name).join(separator);
}

/** 把扁平部门列表按 sort 排成「父在前、子紧随」的展示顺序 */
export function sortDeptsForTree(depts: readonly DeptDto[]): DeptDto[] {
  const byParent = new Map<string | null, DeptDto[]>();
  for (const dept of depts) {
    const list = byParent.get(dept.parentId);
    if (list) list.push(dept);
    else byParent.set(dept.parentId, [dept]);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sort - b.sort);

  const result: DeptDto[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null) => {
    for (const dept of byParent.get(parentId) ?? []) {
      if (seen.has(dept.id)) continue;
      seen.add(dept.id);
      result.push(dept);
      walk(dept.id);
    }
  };
  walk(null);
  for (const dept of depts) if (!seen.has(dept.id)) result.push(dept);
  return result;
}

export function departmentTreeRows<
  T extends { id: string; parentId: string | null; name: string; code: string | null; sort: number },
>(rows: readonly T[], keyword: string) {
  const term = keyword.trim().toLowerCase();
  const include = new Set<string>();
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const row of rows) {
    if (term && !`${row.name} ${row.code ?? ''}`.toLowerCase().includes(term)) continue;
    let current: T | undefined = row;
    while (current && !include.has(current.id)) {
      include.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }
  const result: { row: T; depth: number }[] = [];
  const visited = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const row of rows.filter((item) => item.parentId === parentId).toSorted((a, b) => a.sort - b.sort)) {
      if (visited.has(row.id)) continue;
      visited.add(row.id);
      if (include.has(row.id)) result.push({ row, depth });
      walk(row.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const row of rows) if (!visited.has(row.id) && include.has(row.id)) result.push({ row, depth: 0 });
  return result;
}
