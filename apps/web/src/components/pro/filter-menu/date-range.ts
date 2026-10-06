import type { FilterCondition } from '../filter-builder/types';

export type QuickRangeKey = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisQuarter';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function quickRangeDates(key: QuickRangeKey, now = new Date()): [string, string] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === 'today') return [isoDate(today), isoDate(today)];
  if (key === 'last7') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return [isoDate(from), isoDate(today)];
  }
  if (key === 'last30') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return [isoDate(from), isoDate(today)];
  }
  if (key === 'thisMonth')
    return [isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), isoDate(today)];
  if (key === 'lastMonth') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return [isoDate(from), isoDate(to)];
  }
  const quarterStart = Math.floor(today.getMonth() / 3) * 3;
  return [isoDate(new Date(today.getFullYear(), quarterStart, 1)), isoDate(today)];
}

export function commitFilterValue(condition: FilterCondition | null): FilterCondition | null {
  if (!condition) return null;
  if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') return condition;
  const value = condition.value;
  if (value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (Array.isArray(value) && value.every((item) => item === '')) return null;
  return condition;
}
