import {
  isFilterGroup,
  type FilterCondition,
  type FilterFieldDef,
  type FilterGroup,
  type FilterNode,
  type FilterRoot,
} from './types';

let idSeq = 0;

export function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function mapConditions(
  root: FilterRoot,
  fn: (condition: FilterCondition) => FilterCondition,
): FilterRoot {
  return {
    op: 'and',
    items: root.items.map((node) =>
      isFilterGroup(node)
        ? { ...node, items: node.items.map((child) => (isFilterGroup(child) ? child : fn(child))) }
        : fn(node),
    ),
  };
}

/** 删除条件；组内删空则连组一起删，组内只剩 1 条则把它拆回根级（板只允许一层组，单条组无意义） */
export function removeConditionFrom(root: FilterRoot, id: string): FilterRoot {
  const items: FilterNode[] = [];

  for (const node of root.items) {
    if (!isFilterGroup(node)) {
      if (node.id !== id) items.push(node);
      continue;
    }

    const kept = node.items.filter((child) => isFilterGroup(child) || child.id !== id);
    if (kept.length === 0) continue;
    if (kept.length === 1) {
      const only = kept[0];
      if (only) items.push(only);
      continue;
    }
    items.push({ ...node, items: kept });
  }

  return { op: 'and', items };
}

export function groupConditionIn(root: FilterRoot, id: string): FilterRoot {
  return {
    op: 'and',
    items: root.items.map((node) => {
      if (isFilterGroup(node) || node.id !== id) return node;
      return { id: nextId('group'), op: 'or', items: [node] } satisfies FilterGroup;
    }),
  };
}

/** 把组内条件移出到根级（原位展开）；组剩 1 条同样拆平 */
export function ungroupConditionIn(root: FilterRoot, id: string): FilterRoot {
  const items: FilterNode[] = [];

  for (const node of root.items) {
    if (!isFilterGroup(node) || !node.items.some((child) => !isFilterGroup(child) && child.id === id)) {
      items.push(node);
      continue;
    }

    const moved = node.items.find((child) => !isFilterGroup(child) && child.id === id);
    const kept = node.items.filter((child) => isFilterGroup(child) || child.id !== id);

    if (kept.length === 1) {
      const only = kept[0];
      if (only) items.push(only);
    } else if (kept.length > 1) {
      items.push({ ...node, items: kept });
    }
    if (moved) items.push(moved);
  }

  return { op: 'and', items };
}

export function findGroupOf(root: FilterRoot, id: string): FilterGroup | undefined {
  for (const node of root.items) {
    if (!isFilterGroup(node)) continue;
    if (node.items.some((child) => !isFilterGroup(child) && child.id === id)) return node;
  }
  return undefined;
}

function optionLabel(field: FilterFieldDef | undefined, raw: string): string {
  return field?.options?.find((option) => option.value === raw)?.label ?? raw;
}

export function formatConditionValue(
  field: FilterFieldDef | undefined,
  condition: FilterCondition,
  emptyLabel: string,
): string {
  const { value } = condition;
  if (value === null) return '';

  if (Array.isArray(value)) {
    if (condition.operator === 'between') {
      const from = value[0] ?? '';
      const to = value[1] ?? '';
      if (!from && !to) return emptyLabel;
      return `${from} ~ ${to}`;
    }
    if (value.length === 0) return emptyLabel;
    return value.map((item) => optionLabel(field, item)).join('、');
  }

  if (value === '') return emptyLabel;
  return optionLabel(field, value);
}
