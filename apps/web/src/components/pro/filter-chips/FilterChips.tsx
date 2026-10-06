import { useRef, useState, type JSX } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  isFilterGroup,
  type FilterCondition,
  type FilterFieldDef,
  type FilterRoot,
} from '../filter-builder/types';
import { isSameFilterRoot, upsertCondition } from '../filter-builder/value';
import { FilterValuePanel, type FilterValuePanelLabels } from '../filter-menu/FilterValuePanel';
import { commitFilterValue } from '../filter-menu/date-range';
import { formatFilterChip, type FilterChipFormatLabels } from './formatFilterChip';
import { SchemeMenu, type SchemeMenuItem } from './SchemeMenu';
import { useRowOverflow } from './useRowOverflow';

export interface FilterChipsLabels extends FilterChipFormatLabels {
  advanced: string;
  clear: string;
  modified: string;
  save: string;
  saveAs: string;
  more: (n: number) => string;
  /** 展开后的「收起」入口 */
  collapse: string;
  removeCondition: (label: string) => string;
  /** 方案徽标下拉的「我的方案」节标题 */
  schemesTitle: string;
  /** 方案徽标下拉的「管理方案…」 */
  manageSchemes: string;
}

export interface FilterChipsProps {
  value: FilterRoot;
  fields: FilterFieldDef[];
  onChange: (next: FilterRoot) => void;
  onOpenAdvanced?: (focusConditionId?: string) => void;
  onClear: () => void;
  scheme?: { id: string; name: string; modified: boolean };
  /** 方案徽标下拉里可切换的方案 */
  schemes?: SchemeMenuItem[];
  onApplyScheme?: (id: string) => void;
  onManageSchemes?: () => void;
  onSchemeSave?: () => void;
  onSchemeSaveAs?: () => void;
  panelLabels: FilterValuePanelLabels;
  labels: FilterChipsLabels;
  /** 折叠行数上限（D9），默认 2 行 */
  maxRows?: number;
}

const chipItemSelector = '[data-chip-item="true"]';

function fieldOf(fields: FilterFieldDef[], key: string) {
  return fields.find((field) => field.key === key);
}

// 内部按「字段 | 条件」分段，段间 1px #f0f0ee 分隔线；展开态换橙边淡橙底（L112）；「更多 / 收起」走 L123 的虚线壳。
const chipShellClassName =
  'inline-flex h-[var(--control-sm)] items-center overflow-hidden rounded-md border border-(--filter-chip-border) text-[calc(12.5px*var(--app-scale))] transition-colors';
const chipSegmentClassName = 'inline-flex h-full items-center px-[calc(8px*var(--app-scale))]';
const chipDividerClassName = 'w-px self-stretch bg-(--filter-chip-divider)';

export function FilterChips({
  value,
  fields,
  onChange,
  onOpenAdvanced,
  onClear,
  scheme,
  schemes,
  onApplyScheme,
  onManageSchemes,
  onSchemeSave,
  onSchemeSaveAs,
  panelLabels,
  labels,
  maxRows = 2,
}: FilterChipsProps): JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const draftRef = useRef<FilterCondition | null>(null);
  // 关闭 chip 面板即提交草稿；无改动不提交：否则每次开合都会重写 URL 并复位页码（review A3）
  const commitAndClose = (fieldKey: string) => {
    const committed = commitFilterValue(draftRef.current);
    const nextRoot = upsertCondition(value, fieldKey, committed);
    if (!isSameFilterRoot(nextRoot, value)) onChange(nextRoot);
    setOpenId(null);
  };
  const items = value.items;

  // 折叠按「真实行数」算（D9）：测量每个 chip 的 offsetTop 分行，超过 maxRows 行的折成「+N」
  const { containerRef, visibleCount, hiddenCount } = useRowOverflow<HTMLDivElement>({
    itemCount: items.length,
    maxRows,
    enabled: !expanded && maxRows >= 1,
    itemSelector: chipItemSelector,
  });
  const visible = items.slice(0, visibleCount);

  const removeNode = (id: string) => {
    onChange({ op: 'and', items: items.filter((node) => node.id !== id) });
  };

  return (
    <div
      data-slot="filter-chips"
      ref={containerRef}
      className={cn(
        'flex flex-wrap items-center gap-[calc(6px*var(--app-scale))]',
        !expanded && 'overflow-hidden',
      )}
      // 折叠时按行高封顶，测量那一帧（全部渲染）不会把多余的行漏出来
      style={
        expanded || maxRows < 1
          ? undefined
          : { maxHeight: `calc(${maxRows * 28 + (maxRows - 1) * 6}px * var(--app-scale))` }
      }
    >
      {scheme && (
        <SchemeMenu
          scheme={scheme}
          schemes={schemes}
          onApplyScheme={onApplyScheme}
          onManageSchemes={onManageSchemes}
          labels={{
            schemesTitle: labels.schemesTitle,
            manage: labels.manageSchemes,
            modified: labels.modified,
          }}
        />
      )}

      {visible.map((node) => {
        const text = formatFilterChip(node, fields, labels);
        const splitAt = text.indexOf('：');
        const fieldPart = splitAt >= 0 ? text.slice(0, splitAt) : text;
        const restPart = splitAt >= 0 ? text.slice(splitAt + 1) : '';
        if (isFilterGroup(node)) {
          return (
            <button
              key={node.id}
              type="button"
              data-slot="filter-chip"
              data-chip-item="true"
              data-kind="group"
              className={cn(
                chipShellClassName,
                'cursor-pointer bg-(--filter-chip-bg) px-[calc(8px*var(--app-scale))] text-(--filter-chip-value-fg) hover:bg-(--filter-chip-bg-hover)',
              )}
              onClick={() =>
                onOpenAdvanced?.(node.items[0] && !isFilterGroup(node.items[0]) ? node.items[0].id : node.id)
              }
            >
              {text}
            </button>
          );
        }

        const field = fieldOf(fields, node.field);
        return (
          <Popover
            key={node.id}
            open={openId === node.id}
            onOpenChange={(next) => {
              if (next) {
                draftRef.current = node;
                setOpenId(node.id);
                return;
              }
              commitAndClose(node.field);
            }}
          >
            <span
              data-slot="filter-chip"
              data-chip-item="true"
              data-state={openId === node.id ? 'active' : 'idle'}
              className={cn(
                chipShellClassName,
                'group/chip text-(--filter-chip-value-fg)',
                openId === node.id
                  ? 'border-(--filter-chip-border-active) bg-(--filter-chip-bg-active)'
                  : 'bg-(--filter-chip-bg) hover:bg-(--filter-chip-bg-hover)',
              )}
            >
              <PopoverTrigger asChild>
                {/* 可访问名给完整「字段：条件」串：视觉上分段无冒号，读屏与测试仍拿整句 */}
                <button
                  type="button"
                  aria-label={text}
                  className="inline-flex h-full cursor-pointer items-center"
                >
                  {/* 板 L114：字段名灰段 | 1px 分隔 | 条件段；文案来自 formatFilterChip 的「字段：条件」 */}
                  <span className={cn(chipSegmentClassName, 'text-(--filter-chip-field-fg)')}>
                    {fieldPart}
                  </span>
                  {restPart && <span aria-hidden="true" className={chipDividerClassName} />}
                  {restPart && <span className={cn(chipSegmentClassName, 'font-medium')}>{restPart}</span>}
                  <ChevronDown className="mr-[calc(6px*var(--app-scale))] size-[calc(11px*var(--app-scale))] opacity-0 group-hover/chip:opacity-100" />
                </button>
              </PopoverTrigger>
              <button
                type="button"
                aria-label={labels.removeCondition(text)}
                className="cursor-pointer pr-[calc(8px*var(--app-scale))] text-(--filter-chip-remove-fg) opacity-0 group-hover/chip:opacity-100"
                onClick={() => removeNode(node.id)}
              >
                <X className="size-[calc(11px*var(--app-scale))]" />
              </button>
            </span>
            <PopoverContent align="start" sideOffset={6} className="w-(--filter-panel-w) p-0">
              {field && (
                <FilterValuePanel
                  field={field}
                  condition={node}
                  labels={panelLabels}
                  onCommit={(next) => {
                    draftRef.current = next;
                    // 单选点即提交 / 文本 Enter 或清空：与 FilterMenu 同规矩，确认即收起并生效
                    //（只存草稿等关闭的话，Enter 和清空钮看起来都"没反应"）
                    if (field.input === 'select' || field.input === 'text') commitAndClose(node.field);
                  }}
                  onDraftChange={(next) => {
                    draftRef.current = next;
                  }}
                />
              )}
            </PopoverContent>
          </Popover>
        );
      })}

      {hiddenCount > 0 && (
        <button
          type="button"
          data-slot="filter-chips-more"
          className={cn(
            chipShellClassName,
            'cursor-pointer border-dashed bg-transparent px-[calc(10px*var(--app-scale))] text-(--text-3) hover:bg-(--filter-chip-bg-hover)',
          )}
          onClick={() => setExpanded(true)}
        >
          {labels.more(hiddenCount)}
        </button>
      )}

      {expanded && (
        <button
          type="button"
          data-slot="filter-chips-collapse"
          className={cn(
            chipShellClassName,
            'cursor-pointer border-dashed bg-transparent px-[calc(10px*var(--app-scale))] text-(--text-3) hover:bg-(--filter-chip-bg-hover)',
          )}
          onClick={() => setExpanded(false)}
        >
          {labels.collapse}
        </button>
      )}

      <span className="ml-auto flex items-center gap-[calc(10px*var(--app-scale))]">
        {scheme?.modified && (
          <>
            {onSchemeSave && (
              <button
                type="button"
                className="cursor-pointer text-[calc(12.5px*var(--app-scale))] text-(--table-action-fg)"
                onClick={onSchemeSave}
              >
                {labels.save}
              </button>
            )}
            {onSchemeSaveAs && (
              <button
                type="button"
                className="cursor-pointer text-[calc(12.5px*var(--app-scale))] text-(--table-action-fg)"
                onClick={onSchemeSaveAs}
              >
                {labels.saveAs}
              </button>
            )}
          </>
        )}
        {onOpenAdvanced && (
          <button
            type="button"
            data-slot="filter-chips-advanced"
            className="inline-flex cursor-pointer items-center gap-[calc(4px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))] text-(--text-3)"
            onClick={() => onOpenAdvanced()}
          >
            <SlidersHorizontal className="size-[calc(12px*var(--app-scale))]" />
            {labels.advanced}
          </button>
        )}
        <button
          type="button"
          data-slot="filter-chips-clear"
          className="cursor-pointer text-[calc(12.5px*var(--app-scale))] text-(--text-3)"
          onClick={onClear}
        >
          {labels.clear}
        </button>
      </span>
    </div>
  );
}
