// 子面板共用的纯工具（不含组件，供 panels/* 复用）。
import type { FilterCondition, FilterValue } from '../../filter-builder/types';

/** 编辑既有条件时沿用其 id，新增时生成一个（id 不参与结构比较，见 value.ts 的 isSameFilterRoot） */
export function conditionId(field: string, current: FilterCondition | null): string {
  return current?.id ?? `${field}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toStringList(value: FilterValue): string[] {
  if (value === null) return [];
  return Array.isArray(value) ? value.filter(Boolean) : value === '' ? [] : [value];
}
