// 灰底括号分组）。这是 pro 组件与业务 model.ts 之间的共享契约：pro 只认这个形状；业务包负责 URL 序列化与匹配求值。
// 结构约束（板）：根节点是 and 链；允许一层括号分组（组内 and/or 二选一）；不支持组套组。

import type { PickerPopoverLabels } from '../PickerPopover';

export type FilterOperator =
  'eq' | 'ne' | 'contains' | 'in' | 'notIn' | 'gte' | 'lte' | 'between' | 'isEmpty' | 'isNotEmpty';

/** 值形状按运算符：in/notIn → string[]；between → [from, to]；isEmpty/isNotEmpty → null；其余 → string */
export type FilterValue = string | string[] | [string, string] | null;

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: FilterValue;
  /** 部门条件：缺省 = 含下级；`'exact'` = 只看所选节点自身 */
  scope?: 'exact';
}

export interface FilterGroup {
  id: string;
  op: 'and' | 'or';
  items: FilterNode[];
}

export type FilterNode = FilterCondition | FilterGroup;

export interface FilterRoot {
  op: 'and';
  items: FilterNode[];
}

export type FilterInputKind = 'text' | 'number' | 'select' | 'multiSelect' | 'date' | 'dateRange' | 'tree';

export interface FilterOption {
  value: string;
  label: string;
  /** tree 型输入的层级（可选） */
  parentValue?: string | null;
}

interface FilterFieldBase {
  key: string;
  label: string;
  operators: FilterOperator[];
  options?: FilterOption[];
  placeholder?: string;
  /** popover「按字段筛选」列表排前 */
  quick?: boolean;
  /** 预留：与 columns 共享排序白名单（本期 columns 自己声明） */
  sortable?: boolean;
  /** chip 上的字段名，默认 = label */
  chipLabel?: string;
  /** 特殊显示（日期 mono 等）；默认按 options 反查 */
  formatValue?: (value: FilterValue) => string;
}

/* 它必须拿到自己的文案。做成可选就得在组件里留一条「没给文案时退回扁平 SelectControl」的兜底路径—— 那是项目明令禁止的「同一件事两种结构」。这里让类型系统保证：声明 tree 就必须给 pickerLabels， */
export type FilterFieldDef =
  | (FilterFieldBase & { input: Exclude<FilterInputKind, 'tree'> })
  | (FilterFieldBase & {
      input: 'tree';
      options: FilterOption[];
      pickerLabels: PickerPopoverLabels;
    });

export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return 'items' in node;
}

export const emptyFilterRoot: FilterRoot = { op: 'and', items: [] };

export function countFilterConditions(root: FilterRoot): number {
  return root.items.reduce((n, node) => n + (isFilterGroup(node) ? node.items.length : 1), 0);
}
