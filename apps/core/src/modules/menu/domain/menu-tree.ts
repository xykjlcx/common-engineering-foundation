import type { MenuRecordData, MenuTreeNode } from '../tree-contract.js';
export type { MenuRecordData, MenuTreeNode } from '../tree-contract.js';

/**
 * 平铺记录 → 树。定序：先 sort 升序，同 sort 用 id 兜底——
 * 不给次键时同 sort 节点的相对顺序由 Map 插入序（即 DB 返回序）决定，跨驱动/跨查询计划会漂，
 * 前端快照与端到端断言会随机红。
 *
 * **不做环检测**：父只能是更高一层的类型（见 menu-rules.ts `assertMenuHierarchy`），
 * 且编辑路径保持同一层级规则，故经应用层写入的数据造不出环。
 * 若将来放开 parentId 可改，必须在这里补环检测——当前形态下环会让整条链**从树里静默消失**
 * （既不是根、父也进不了根），是那种没有任何征兆的坏。
 */
export function buildMenuTree(records: readonly MenuRecordData[]): MenuTreeNode[] {
  const nodes = new Map<string, MenuTreeNode>(records.map((r) => [r.id, { ...r, children: [] }]));
  const roots: MenuTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId === null ? undefined : nodes.get(node.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortRecursive = (list: MenuTreeNode[]): void => {
    list.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
    for (const node of list) sortRecursive(node.children);
  };
  sortRecursive(roots);
  return roots;
}
