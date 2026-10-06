// FilterBuilder 值形状的纯逻辑（与组件分文件：react-refresh 只允许组件文件导出组件）。
// 契约来自 ./types.ts：in/notIn → string[]；between → [from, to]；isEmpty/isNotEmpty → null；其余 → string。
import {
  isFilterGroup,
  type FilterCondition,
  type FilterOperator,
  type FilterRoot,
  type FilterValue,
} from './types';

/** 运算符换挡时按新形状重置值 */
export function defaultFilterValue(operator: FilterOperator): FilterValue {
  if (operator === 'in' || operator === 'notIn') return [];
  if (operator === 'between') return ['', ''];
  if (operator === 'isEmpty' || operator === 'isNotEmpty') return null;
  return '';
}

/** 无值运算符：chip 只渲染「字段 | 运算符」两段，popover 不渲染值控件 */
export function isValuelessOperator(operator: FilterOperator): boolean {
  return operator === 'isEmpty' || operator === 'isNotEmpty';
}

/** 根级 items 数（叶子 1、分组 1）。筛选钮 N / busy 胶囊 / chips 行显隐用这个，不是叶子数。 */
export function chipCount(root: FilterRoot): number {
  return root.items.length;
}

/** 末尾叶子条件：根级从后往前，碰到分组则取其组内最后一条叶子 */
export function lastLeaf(root: FilterRoot): FilterCondition | null {
  for (let index = root.items.length - 1; index >= 0; index -= 1) {
    const node = root.items[index];
    if (!node) continue;
    if (!isFilterGroup(node)) return node;
    for (let childIndex = node.items.length - 1; childIndex >= 0; childIndex -= 1) {
      const child = node.items[childIndex];
      if (child && !isFilterGroup(child)) return child;
    }
  }
  return null;
}

/** 只动根级第一条同字段条件；分组里的同字段不动（高级分组走弹窗） */
export function upsertCondition(
  root: FilterRoot,
  field: string,
  condition: FilterCondition | null,
): FilterRoot {
  if (condition === null) return removeCondition(root, field);
  const items = [...root.items];
  const index = items.findIndex((node) => !isFilterGroup(node) && node.field === field);
  if (index >= 0) {
    const current = items[index];
    if (current && !isFilterGroup(current)) {
      items[index] = { ...condition, id: current.id };
    }
    return { op: 'and', items };
  }
  return { op: 'and', items: [...items, condition] };
}

export function removeCondition(root: FilterRoot, field: string): FilterRoot {
  return {
    op: 'and',
    items: root.items.filter((node) => isFilterGroup(node) || node.field !== field),
  };
}

/** 值深比较：in/notIn → string[]；between → [from,to]；其余标量 */
function isSameValue(left: FilterValue, right: FilterValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return left.length === right.length && left.every((item, index) => item === right[index]);
  }
  return left === right;
}

function isSameNode(left: FilterRoot['items'][number], right: FilterRoot['items'][number]): boolean {
  const leftIsGroup = isFilterGroup(left);
  if (leftIsGroup !== isFilterGroup(right)) return false;
  if (leftIsGroup && isFilterGroup(right)) {
    if (left.op !== right.op || left.items.length !== right.items.length) return false;
    return left.items.every((item, index) => {
      const other = right.items[index];
      return other !== undefined && isSameNode(item, other);
    });
  }
  if (isFilterGroup(left) || isFilterGroup(right)) return false;
  return (
    left.field === right.field &&
    left.operator === right.operator &&
    (left.scope ?? undefined) === (right.scope ?? undefined) &&
    isSameValue(left.value, right.value)
  );
}

/**
 * 结构等价比较（忽略条件 id）。二级面板 / chip 面板关闭时用它判定「没改动」，
 * 相同就不触发 onChange——否则每次开合都会重写 URL 并把 page 复位到 1。
 */
export function isSameFilterRoot(left: FilterRoot, right: FilterRoot): boolean {
  if (left.op !== right.op || left.items.length !== right.items.length) return false;
  return left.items.every((item, index) => {
    const other = right.items[index];
    return other !== undefined && isSameNode(item, other);
  });
}
