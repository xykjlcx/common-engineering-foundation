/**
 * FilterBuilder —— 列表页唯一的筛选语法：条件构造器。
 *
 * 板：design-explore/pipeline-board/FilterBuilder.dc.html「条件构造行」（L109-124）。逐值出处：
 *   · 行容器           L110  display:flex; align-items:center; gap:7px; padding-bottom:2px
 *   · 行首「筛选」小标  L111  font-size:12.5px; color:#8f8f8c; gap:6px; svg 13×13 stroke=#9a9a97
 *   · 条件 chip        L112/114/120/122  height:28px; border-radius:4px; font-size:12.5px; overflow:hidden
 *                      普通态 background:#fdfdfc; border:1px solid #ececea
 *                      高亮态 background:#fffaf4; border:1px solid #f7c99a（板上首个日期条件，
 *                      本组件按「当前正在编辑（popover 打开）的条件」语义落地）
 *   · chip 三段        padding:0 8px；字段段 #8f8f8c / 运算符段 #636361 / 值段 #1c1c1a font-weight:500
 *   · 段间竖线         width:1px; background:#f0f0ee; align-self:stretch
 *   · 尾部 ×           padding:0 8px 0 2px; svg 10×10 stroke=#9a9a97
 *   · 连接词 chip      L113/115/119  height:22px; gap:3px; padding:0 7px; border-radius:3px;
 *                      font-size:11.5px; font-weight:500; svg 9×9
 *                      「且」background:#f1f1ef; color:#636361 ／「或」background:#fff2e4; color:#e0680c
 *   · 括号组容器       L116  padding:4px 9px; border-radius:5px; background:#f5f5f3; gap:6px
 *   · mono 括号        L117/121  font-size:13px; color:#b0b0ad
 *   · 「添加条件」     L123  height:28px; gap:5px; padding:0 10px; border-radius:4px;
 *                      border:1px dashed #dcdcd9; font-size:12.5px; color:#8f8f8c; svg 12×12
 *
 * 圆角换算（pipeline --radius-factor .5）：chip 4px = rounded-md（8×.5）；连接词 3px = --badge-radius；
 * 括号组 5px = rounded-10（10×.5）。高度 28 = --control-sm；22 = --filter-connector-h。
 *
 * 结构约束（./types.ts）：根级恒 and 链；只允许一层括号分组；组内 and/or 二选一，组不能套组。
 * pro 组件纪律：不 useTranslation、不 import @/modules/**，文案全部经 props 注入。
 */
import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, Funnel, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SelectControl, type SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FilterValuePanelLabels } from '../filter-menu/panels/labels';
import {
  isFilterGroup,
  type FilterCondition,
  type FilterFieldDef,
  type FilterOperator,
  type FilterRoot,
} from './types';
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
import { FilterBuilderRows, type FilterBuilderRowLabels } from './FilterBuilderRows';
import { defaultFilterValue, isValuelessOperator } from './value';

export interface FilterBuilderLabels {
  filter: string;

  add: string;
  /** 连接词「且」 */
  and: string;
  /** 连接词「或」 */
  or: string;
  /** chip 尾部 × 的无障碍名 */
  remove: string;
  /** popover 内三个控件的无障碍名 */
  field: string;
  operator: string;
  value: string;
  /** 「加入括号组」/「从组移出」 */
  group: string;
  ungroup: string;
  /** 值未填时 chip 值段的占位文案 */
  emptyValue: string;
  /** between / dateRange 两个输入的无障碍名 */
  rangeFrom: string;
  rangeTo: string;
  /** 连接词 chip 的无障碍名（组内可点，用于说明「切换且/或」） */
  toggleConnector: string;
}

export interface FilterBuilderProps {
  value: FilterRoot;
  onChange: (next: FilterRoot) => void;
  /** 可筛字段定义（文案已由业务翻译） */
  fields: FilterFieldDef[];
  /** 运算符文案映射（文案已由业务翻译） */
  operatorLabels: Partial<Record<FilterOperator, string>>;
  labels: FilterBuilderLabels;

  defaultOpenConditionId?: string;
  /** 部门树「含下级」开关文案；不传则树面板不渲染该开关 */
  includeSubLabel?: string;

  panelLabels: FilterValuePanelLabels;
  className?: string;
  /** chips：行内 chip 流（列表条件栏）；rows：一条件一行（高级筛选弹窗），需同时给 rowLabels */
  layout?: 'chips' | 'rows';
  rowLabels?: FilterBuilderRowLabels;
}

const chipTextClassName = 'text-[calc(12.5px*var(--app-scale))]';
const chipSegmentClassName = 'px-[calc(8px*var(--app-scale))]';
const chipDividerClassName = 'w-px self-stretch bg-(--filter-chip-divider)';
const connectorBaseClassName =
  'inline-flex h-[var(--filter-connector-h)] shrink-0 items-center gap-[calc(3px*var(--app-scale))] rounded-(--badge-radius) px-[calc(7px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] font-medium';

function FilterChipsBuilder({
  value,
  onChange,
  fields,
  operatorLabels,
  labels,
  defaultOpenConditionId,
  includeSubLabel,
  panelLabels,
  className,
}: FilterBuilderProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenConditionId ?? null);

  const fieldOptions = useMemo<SelectOption[]>(
    () => fields.map((field) => ({ value: field.key, label: field.label })),
    [fields],
  );
  const fieldByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);

  const patchCondition = (id: string, patch: Partial<FilterCondition>) => {
    onChange(
      mapConditions(value, (condition) => (condition.id === id ? { ...condition, ...patch } : condition)),
    );
  };

  const addCondition = () => {
    const first = fields[0];
    if (!first) return;
    const operator = first.operators[0] ?? 'eq';
    const condition: FilterCondition = {
      id: nextId('cond'),
      field: first.key,
      operator,
      value: defaultFilterValue(operator),
    };
    onChange({ op: 'and', items: [...value.items, condition] });
    setOpenId(condition.id);
  };

  const removeCondition = (id: string) => {
    setOpenId((current) => (current === id ? null : current));
    onChange(removeConditionFrom(value, id));
  };

  const toggleGroupOp = (groupId: string) => {
    onChange({
      op: 'and',
      items: value.items.map((node) =>
        isFilterGroup(node) && node.id === groupId ? { ...node, op: node.op === 'and' ? 'or' : 'and' } : node,
      ),
    });
  };

  const renderCondition = (condition: FilterCondition) => {
    const field = fieldByKey.get(condition.field);
    const open = openId === condition.id;
    const group = findGroupOf(value, condition.id);
    const displayValue = formatConditionValue(field, condition, labels.emptyValue);

    return (
      <span
        key={condition.id}
        data-slot="filter-chip"
        data-state={open ? 'active' : 'idle'}
        className={cn(
          'inline-flex h-[var(--control-sm)] shrink-0 items-center overflow-hidden rounded-md border',
          chipTextClassName,
          open
            ? 'border-(--filter-chip-border-active) bg-(--filter-chip-bg-active)'
            : 'border-(--filter-chip-border) bg-(--filter-chip-bg)',
        )}
      >
        <Popover open={open} onOpenChange={(next) => setOpenId(next ? condition.id : null)}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-full cursor-pointer items-center outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)"
            >
              <span className={cn(chipSegmentClassName, 'text-(--filter-chip-field-fg)')}>
                {field?.label ?? condition.field}
              </span>
              <span aria-hidden="true" className={chipDividerClassName} />
              <span className={cn(chipSegmentClassName, 'text-(--filter-chip-op-fg)')}>
                {operatorLabels[condition.operator] ?? condition.operator}
              </span>
              {!isValuelessOperator(condition.operator) && (
                <>
                  <span aria-hidden="true" className={chipDividerClassName} />
                  <span className={cn(chipSegmentClassName, 'font-medium text-(--filter-chip-value-fg)')}>
                    {displayValue}
                  </span>
                </>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[calc(268px*var(--app-scale))] p-[calc(10px*var(--app-scale))]"
          >
            <ConditionEditor
              condition={condition}
              field={field}
              fields={fields}
              fieldOptions={fieldOptions}
              operatorLabels={operatorLabels}
              labels={labels}
              inGroup={!!group}
              onPatch={(patch) => patchCondition(condition.id, patch)}
              onGroup={() => onChange(groupConditionIn(value, condition.id))}
              onUngroup={() => onChange(ungroupConditionIn(value, condition.id))}
              onRemove={() => removeCondition(condition.id)}
              includeSubLabel={includeSubLabel}
              panelLabels={panelLabels}
            />
          </PopoverContent>
        </Popover>
        <button
          type="button"
          aria-label={`${labels.remove} ${field?.label ?? condition.field}`}
          className="flex h-full cursor-pointer items-center pr-[calc(8px*var(--app-scale))] pl-[calc(2px*var(--app-scale))] text-(--filter-chip-remove-fg) outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)"
          onClick={() => removeCondition(condition.id)}
        >
          <X aria-hidden="true" className="size-[calc(10px*var(--app-scale))]" />
        </button>
      </span>
    );
  };

  return (
    <div
      data-slot="filter-builder"
      role="group"
      aria-label={labels.filter}
      className={cn(
        'flex flex-wrap items-center gap-[calc(7px*var(--app-scale))] pb-[calc(2px*var(--app-scale))]',
        className,
      )}
    >
      <span
        data-slot="filter-builder-label"
        className={cn(
          'flex shrink-0 items-center gap-[calc(6px*var(--app-scale))] text-(--filter-label-fg)',
          chipTextClassName,
        )}
      >
        <Funnel aria-hidden="true" className="size-[calc(13px*var(--app-scale))]" />
        <span>{labels.filter}</span>
      </span>

      {value.items.map((node, index) => (
        <Fragment key={node.id}>
          {index > 0 && (
            <span
              data-slot="filter-connector"
              data-op="and"
              className={cn(
                connectorBaseClassName,
                'bg-(--filter-connector-bg) text-(--filter-connector-fg)',
              )}
            >
              {labels.and}
            </span>
          )}
          {isFilterGroup(node) ? (
            <span
              data-slot="filter-group"
              className="inline-flex shrink-0 items-center gap-[calc(6px*var(--app-scale))] rounded-10 bg-(--filter-group-bg) px-[calc(9px*var(--app-scale))] py-[calc(4px*var(--app-scale))]"
            >
              <span
                aria-hidden="true"
                className="font-mono text-[calc(13px*var(--app-scale))] text-(--filter-group-paren-fg)"
              >
                (
              </span>
              {node.items.map((child, childIndex) => (
                <Fragment key={child.id}>
                  {childIndex > 0 && (
                    <button
                      type="button"
                      data-slot="filter-connector"
                      data-op={node.op}
                      aria-label={labels.toggleConnector}
                      className={cn(
                        connectorBaseClassName,
                        'cursor-pointer outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)',
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
                  {isFilterGroup(child) ? null : renderCondition(child)}
                </Fragment>
              ))}
              <span
                aria-hidden="true"
                className="font-mono text-[calc(13px*var(--app-scale))] text-(--filter-group-paren-fg)"
              >
                )
              </span>
            </span>
          ) : (
            renderCondition(node)
          )}
        </Fragment>
      ))}

      <button
        type="button"
        data-slot="filter-add"
        className={cn(
          'inline-flex h-[var(--control-sm)] shrink-0 cursor-pointer items-center gap-[calc(5px*var(--app-scale))] rounded-md border border-dashed border-(--filter-add-border) px-[calc(10px*var(--app-scale))] text-(--filter-add-fg) outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)',
          chipTextClassName,
        )}
        onClick={addCondition}
      >
        <Plus aria-hidden="true" className="size-[calc(12px*var(--app-scale))]" />
        <span>{labels.add}</span>
      </button>
    </div>
  );
}

interface ConditionEditorProps {
  condition: FilterCondition;
  field: FilterFieldDef | undefined;
  fields: FilterFieldDef[];
  fieldOptions: SelectOption[];
  operatorLabels: Partial<Record<FilterOperator, string>>;
  labels: FilterBuilderLabels;
  inGroup: boolean;
  onPatch: (patch: Partial<FilterCondition>) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onRemove: () => void;
  includeSubLabel?: string;
  panelLabels: FilterValuePanelLabels;
}

function ConditionEditor({
  condition,
  field,
  fields,
  fieldOptions,
  operatorLabels,
  labels,
  inGroup,
  onPatch,
  onGroup,
  onUngroup,
  onRemove,
  includeSubLabel,
  panelLabels,
}: ConditionEditorProps) {
  const operatorOptions: SelectOption[] = (field?.operators ?? []).map((operator) => ({
    value: operator,
    label: operatorLabels[operator] ?? operator,
  }));

  const onFieldChange = (nextKey: string) => {
    const nextField = fields.find((item) => item.key === nextKey);
    const nextOperator = nextField?.operators[0] ?? condition.operator;
    onPatch({ field: nextKey, operator: nextOperator, value: defaultFilterValue(nextOperator) });
  };

  const onOperatorChange = (nextOperator: string) => {
    const operator = nextOperator as FilterOperator;
    onPatch({ operator, value: defaultFilterValue(operator) });
  };

  return (
    <div className="grid gap-[calc(8px*var(--app-scale))]">
      <SelectControl
        size="sm"
        aria-label={labels.field}
        value={condition.field}
        options={fieldOptions}
        onValueChange={onFieldChange}
      />
      <SelectControl
        size="sm"
        aria-label={labels.operator}
        value={condition.operator}
        options={operatorOptions}
        onValueChange={onOperatorChange}
      />
      <ConditionValueControl
        condition={condition}
        field={field}
        labels={labels}
        includeSubLabel={includeSubLabel}
        panelLabels={panelLabels}
        onPatch={onPatch}
      />
      <div className="flex flex-wrap items-center gap-[calc(6px*var(--app-scale))]">
        {inGroup ? (
          <Button type="button" size="sm" variant="secondary" onClick={onUngroup}>
            {labels.ungroup}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="secondary" onClick={onGroup}>
            {labels.group}
          </Button>
        )}
        <Button type="button" size="sm" variant="text" className="ml-auto" onClick={onRemove}>
          {labels.remove}
        </Button>
      </div>
    </div>
  );
}

export function FilterBuilder(props: FilterBuilderProps) {
  const { layout = 'chips', rowLabels, ...rest } = props;
  if (layout === 'rows' && rowLabels) return <FilterBuilderRows {...rest} rowLabels={rowLabels} />;
  return <FilterChipsBuilder {...rest} />;
}
