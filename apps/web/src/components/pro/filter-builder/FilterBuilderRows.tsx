/**
 * FilterBuilder 的「行式」布局：一条件一行，字段 / 运算符 / 值 三控件 + 删除，条件之间用「且」连接词，
 * 括号组是带强调左边线的分组卡片（组内可切且/或）。板：design-explore/pipeline-board/UM04AdvancedFilter.dc.html。
 * 条件树操作与值编辑控件与 chip 布局共用（./operations、./ConditionValueControl），pro 组件不做 i18n。
 */
import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, Parentheses, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SelectControl, type SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FilterValuePanelLabels } from '../filter-menu/panels/labels';
import type { FilterBuilderLabels } from './FilterBuilder';
import { ConditionValueControl } from './ConditionValueControl';
import {
  findGroupOf,
  formatConditionValue,
  groupConditionIn,
  mapConditions,
  nextId,
  removeConditionFrom,
  ungroupConditionIn,
} from './operations';
import {
  isFilterGroup,
  type FilterCondition,
  type FilterFieldDef,
  type FilterGroup,
  type FilterOperator,
  type FilterRoot,
} from './types';
import { defaultFilterValue, isValuelessOperator } from './value';

export interface FilterBuilderRowLabels {
  /** 括号组标题与组内连接说明 */
  groupTitle: string;
  groupAny: string;
  groupAll: string;
  /** 底部按钮：新增一个带空条件的括号组 */
  addGroup: string;
  /** 组内追加条件 */
  addInGroup: string;
  /** 值选择器触发按钮未选值时的占位 */
  pickValue: string;
  /** 部门树「含下级」后缀 */
  includeSub: string;
}

interface FilterBuilderRowsProps {
  value: FilterRoot;
  onChange: (next: FilterRoot) => void;
  fields: FilterFieldDef[];
  operatorLabels: Partial<Record<FilterOperator, string>>;
  labels: FilterBuilderLabels;
  rowLabels: FilterBuilderRowLabels;
  defaultOpenConditionId?: string;
  includeSubLabel?: string;
  panelLabels: FilterValuePanelLabels;
  className?: string;
}

const connectorClassName =
  'inline-flex h-[var(--filter-connector-h)] shrink-0 items-center gap-[calc(3px*var(--app-scale))] rounded-(--badge-radius) px-[calc(7px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] font-medium';
const inlineValueKinds = new Set(['text', 'number', 'select', 'date']);

export function FilterBuilderRows({
  value,
  onChange,
  fields,
  operatorLabels,
  labels,
  rowLabels,
  defaultOpenConditionId,
  includeSubLabel,
  panelLabels,
  className,
}: FilterBuilderRowsProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenConditionId ?? null);
  const fieldOptions = useMemo<SelectOption[]>(
    () => fields.map((field) => ({ value: field.key, label: field.label })),
    [fields],
  );
  const fieldByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);

  const blankCondition = (): FilterCondition | null => {
    const first = fields[0];
    if (!first) return null;
    const operator = first.operators[0] ?? 'eq';
    return { id: nextId('cond'), field: first.key, operator, value: defaultFilterValue(operator) };
  };
  const patchCondition = (id: string, patch: Partial<FilterCondition>) =>
    onChange(
      mapConditions(value, (condition) => (condition.id === id ? { ...condition, ...patch } : condition)),
    );
  const addCondition = () => {
    const condition = blankCondition();
    if (condition) onChange({ op: 'and', items: [...value.items, condition] });
  };
  const addGroup = () => {
    const condition = blankCondition();
    if (condition) {
      onChange({
        op: 'and',
        items: [...value.items, { id: nextId('group'), op: 'or', items: [condition] } satisfies FilterGroup],
      });
    }
  };
  const addInGroup = (groupId: string) => {
    const condition = blankCondition();
    if (!condition) return;
    onChange({
      op: 'and',
      items: value.items.map((node) =>
        isFilterGroup(node) && node.id === groupId ? { ...node, items: [...node.items, condition] } : node,
      ),
    });
  };
  const toggleGroupOp = (groupId: string) =>
    onChange({
      op: 'and',
      items: value.items.map((node) =>
        isFilterGroup(node) && node.id === groupId ? { ...node, op: node.op === 'and' ? 'or' : 'and' } : node,
      ),
    });
  const removeCondition = (id: string) => {
    setOpenId((current) => (current === id ? null : current));
    onChange(removeConditionFrom(value, id));
  };

  const renderRow = (condition: FilterCondition) => {
    const field = fieldByKey.get(condition.field);
    const inGroup = !!findGroupOf(value, condition.id);
    const operatorOptions: SelectOption[] = (field?.operators ?? []).map((operator) => ({
      value: operator,
      label: operatorLabels[operator] ?? operator,
    }));
    const valueless = isValuelessOperator(condition.operator);
    const inline =
      !valueless &&
      inlineValueKinds.has(field?.input ?? 'text') &&
      condition.operator !== 'between' &&
      condition.operator !== 'in' &&
      condition.operator !== 'notIn';
    const display = formatConditionValue(field, condition, rowLabels.pickValue);
    const suffix =
      field?.input === 'tree' && includeSubLabel !== undefined && condition.scope !== 'exact'
        ? ` · ${rowLabels.includeSub}`
        : '';

    return (
      <div
        key={condition.id}
        data-slot="filter-row"
        className="flex items-center gap-[calc(8px*var(--app-scale))]"
      >
        <SelectControl
          size="sm"
          aria-label={labels.field}
          className="w-[calc(130px*var(--app-scale))] shrink-0"
          value={condition.field}
          options={fieldOptions}
          onValueChange={(next) => {
            const nextField = fieldByKey.get(next);
            const operator = nextField?.operators[0] ?? condition.operator;
            patchCondition(condition.id, {
              field: next,
              operator,
              value: defaultFilterValue(operator),
              scope: undefined,
            });
          }}
        />
        <SelectControl
          size="sm"
          aria-label={labels.operator}
          className="w-[calc(104px*var(--app-scale))] shrink-0"
          value={condition.operator}
          options={operatorOptions}
          onValueChange={(next) =>
            patchCondition(condition.id, {
              operator: next as FilterOperator,
              value: defaultFilterValue(next as FilterOperator),
            })
          }
        />
        <div className="min-w-0 flex-1">
          {valueless ? null : inline ? (
            <ConditionValueControl
              condition={condition}
              field={field}
              labels={labels}
              includeSubLabel={includeSubLabel}
              panelLabels={panelLabels}
              onPatch={(patch) => patchCondition(condition.id, patch)}
            />
          ) : (
            <Popover
              open={openId === condition.id}
              onOpenChange={(next) => setOpenId(next ? condition.id : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-slot="filter-row-value"
                  aria-label={labels.value}
                  className="ui-field flex h-[var(--control-sm)] w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-[calc(10px*var(--app-scale))] text-left text-[calc(13px*var(--app-scale))] outline-none"
                >
                  <span className="min-w-0 truncate">{display + suffix}</span>
                  <ChevronDown aria-hidden="true" className="size-[calc(14px*var(--app-scale))] shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[calc(300px*var(--app-scale))] p-[calc(10px*var(--app-scale))]"
              >
                <ConditionValueControl
                  condition={condition}
                  field={field}
                  labels={labels}
                  includeSubLabel={includeSubLabel}
                  panelLabels={panelLabels}
                  onPatch={(patch) => patchCondition(condition.id, patch)}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={inGroup ? labels.ungroup : labels.group}
          title={inGroup ? labels.ungroup : labels.group}
          onClick={() =>
            onChange(
              inGroup ? ungroupConditionIn(value, condition.id) : groupConditionIn(value, condition.id),
            )
          }
        >
          <Parentheses data-icon="inline-start" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`${labels.remove} ${field?.label ?? condition.field}`}
          onClick={() => removeCondition(condition.id)}
        >
          <X data-icon="inline-start" aria-hidden="true" />
        </Button>
      </div>
    );
  };

  const connector = (key: string) => (
    <span
      key={key}
      data-slot="filter-connector"
      data-op="and"
      className={cn(connectorClassName, 'w-fit bg-(--filter-connector-bg) text-(--filter-connector-fg)')}
    >
      {labels.and}
    </span>
  );

  return (
    <div
      data-slot="filter-builder"
      data-layout="rows"
      role="group"
      aria-label={labels.filter}
      className={cn('grid gap-[calc(6px*var(--app-scale))]', className)}
    >
      {value.items.map((node, index) => (
        <Fragment key={node.id}>
          {index > 0 && connector(`${node.id}-and`)}
          {isFilterGroup(node) ? (
            <div
              data-slot="filter-group"
              className="grid gap-[calc(6px*var(--app-scale))] rounded-md border-l-[calc(3px*var(--app-scale))] border-l-pri bg-(--filter-group-bg) px-[calc(10px*var(--app-scale))] py-[calc(8px*var(--app-scale))]"
            >
              <div className="flex items-center gap-[calc(8px*var(--app-scale))] text-[calc(12px*var(--app-scale))]">
                <span className="font-semibold text-(--filter-connector-fg-or)">{rowLabels.groupTitle}</span>
                <span className="text-(--filter-label-fg)">
                  {node.op === 'or' ? rowLabels.groupAny : rowLabels.groupAll}
                </span>
                <Button
                  type="button"
                  variant="text"
                  size="xs"
                  className="ml-auto"
                  onClick={() => addInGroup(node.id)}
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  {rowLabels.addInGroup}
                </Button>
              </div>
              {node.items.map((child, childIndex) => (
                <Fragment key={child.id}>
                  {childIndex > 0 && (
                    <button
                      type="button"
                      data-slot="filter-connector"
                      data-op={node.op}
                      aria-label={labels.toggleConnector}
                      className={cn(
                        connectorClassName,
                        'w-fit cursor-pointer outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)',
                        node.op === 'or'
                          ? 'bg-(--filter-connector-bg-or) text-(--filter-connector-fg-or)'
                          : 'bg-(--filter-connector-bg) text-(--filter-connector-fg)',
                      )}
                      onClick={() => toggleGroupOp(node.id)}
                    >
                      <span>{node.op === 'or' ? labels.or : labels.and}</span>
                      <ChevronDown aria-hidden="true" className="size-[calc(9px*var(--app-scale))]" />
                    </button>
                  )}
                  {isFilterGroup(child) ? null : renderRow(child)}
                </Fragment>
              ))}
            </div>
          ) : (
            renderRow(node)
          )}
        </Fragment>
      ))}
      <div className="flex items-center gap-[calc(8px*var(--app-scale))] pt-[calc(4px*var(--app-scale))]">
        <Button type="button" size="sm" variant="secondary" onClick={addCondition}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          {labels.add}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={addGroup}>
          <Parentheses data-icon="inline-start" aria-hidden="true" />
          {rowLabels.addGroup}
        </Button>
      </div>
    </div>
  );
}
