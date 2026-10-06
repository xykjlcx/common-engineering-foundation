import {
  isFilterGroup,
  type FilterCondition,
  type FilterFieldDef,
  type FilterNode,
  type FilterOperator,
  type FilterValue,
} from '../filter-builder/types';

export interface FilterChipFormatLabels {
  includeSub: string;
  operators: Partial<Record<FilterOperator, string>>;
}

function fieldOf(fields: FilterFieldDef[], key: string): FilterFieldDef | undefined {
  return fields.find((field) => field.key === key);
}

function fieldTitle(field: FilterFieldDef | undefined, key: string): string {
  return field?.chipLabel ?? field?.label ?? key;
}

function lookupOption(field: FilterFieldDef | undefined, value: string): string {
  return field?.options?.find((option) => option.value === value)?.label ?? value;
}

function displayValue(field: FilterFieldDef | undefined, value: FilterValue): string {
  if (field?.formatValue) return field.formatValue(value);
  if (value === null) return '';
  if (Array.isArray(value)) return value.map((item) => lookupOption(field, item)).join('、');
  return lookupOption(field, value);
}

function truncateList(labels: string[]): string {
  if (labels.length <= 3) return labels.join('、');
  const shown = labels.slice(0, 3);
  return `${shown.join('、')} +${labels.length - 3}`;
}

function formatCondition(
  condition: FilterCondition,
  fields: FilterFieldDef[],
  labels: FilterChipFormatLabels,
): string {
  const field = fieldOf(fields, condition.field);
  const title = fieldTitle(field, condition.field);
  const operator = condition.operator;

  if (operator === 'isEmpty') return `${title}：${labels.operators.isEmpty ?? '为空'}`;
  if (operator === 'isNotEmpty') return `${title}：${labels.operators.isNotEmpty ?? '不为空'}`;

  const raw = condition.value;
  if (operator === 'in' || operator === 'notIn') {
    const items = Array.isArray(raw) ? raw : raw === null ? [] : [raw];
    const names = items.map((item) => lookupOption(field, item));
    const list = truncateList(names);
    const includeSub =
      field?.input === 'tree' && condition.scope !== 'exact' ? `（${labels.includeSub}）` : '';
    if (operator === 'notIn') {
      return `${title}：${labels.operators.notIn ?? '排除'} ${list}${includeSub}`;
    }
    return `${title}：${list}${includeSub}`;
  }

  if (operator === 'between') {
    const [from, to] = Array.isArray(raw) ? raw : ['', ''];
    return `${title}：${from ?? ''} ~ ${to ?? ''}`;
  }

  const valueText = displayValue(field, raw);
  if (operator === 'ne') return `${title}：${labels.operators.ne ?? '非'} ${valueText}`;
  if (operator === 'contains') return `${title}：${labels.operators.contains ?? '含'} ${valueText}`;
  if (operator === 'gte') return `${title}：≥ ${valueText}`;
  if (operator === 'lte') return `${title}：≤ ${valueText}`;
  return `${title}：${valueText}`;
}

export function formatFilterChip(
  node: FilterNode,
  fields: FilterFieldDef[],
  labels: FilterChipFormatLabels,
): string {
  if (!isFilterGroup(node)) return formatCondition(node, fields, labels);

  const children = node.items.filter((item): item is FilterCondition => !isFilterGroup(item));
  if (children.length === 0) return '';

  const keys = new Set(children.map((child) => child.field));
  if (keys.size === 1) {
    const fieldKey = children[0]?.field ?? '';
    const field = fieldOf(fields, fieldKey);
    const title = fieldTitle(field, fieldKey);
    const parts = children.map((child) => {
      const text = formatCondition(child, fields, labels);
      const prefix = `${title}：`;
      return text.startsWith(prefix) ? text.slice(prefix.length) : text;
    });
    return `${title}：${parts.join(' 或 ')}`;
  }

  return `(${children.map((child) => formatCondition(child, fields, labels)).join(' 或 ')})`;
}
