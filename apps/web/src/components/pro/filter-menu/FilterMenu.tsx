import { useMemo, useRef, useState, type JSX } from 'react';
import { Check, ChevronRight, Funnel, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { FilterCondition, FilterFieldDef, FilterOperator, FilterRoot } from '../filter-builder/types';
import { isSameFilterRoot, upsertCondition } from '../filter-builder/value';
import { FilterValuePanel, type FilterValuePanelLabels } from './FilterValuePanel';
import { commitFilterValue } from './date-range';

export interface FilterMenuScheme {
  id: string;
  name: string;
  conditionCount: number;
  scope: 'mine' | 'shared';
}

export interface FilterMenuLabels {
  trigger: string;
  searchPlaceholder: string;
  schemesTitle: string;
  fieldsTitle: string;
  advanced: string;
  conditionCount: (n: number) => string;
  commitHint: string;
}

export interface FilterMenuProps {
  fields: FilterFieldDef[];
  value: FilterRoot;
  onChange: (next: FilterRoot) => void;
  schemes?: FilterMenuScheme[];
  activeSchemeId?: string;
  onApplyScheme?: (id: string) => void;
  onOpenAdvanced?: () => void;
  operatorLabels: Partial<Record<FilterOperator, string>>;
  labels: FilterMenuLabels;
  panelLabels: FilterValuePanelLabels;
  activeCount: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

function conditionForField(root: FilterRoot, field: string): FilterCondition | null {
  const node = root.items.find((item) => !('items' in item) && item.field === field);
  return node && !('items' in node) ? node : null;
}

function activeFieldKeys(root: FilterRoot): Set<string> {
  const keys = new Set<string>();
  const visit = (items: FilterRoot['items']) => {
    for (const item of items) {
      if ('items' in item) visit(item.items);
      else keys.add(item.field);
    }
  };
  visit(root.items);
  return keys;
}

export function FilterMenu({
  fields,
  value,
  onChange,
  schemes,
  activeSchemeId,
  onApplyScheme,
  onOpenAdvanced,
  labels,
  panelLabels,
  activeCount,
  open: openProp,
  onOpenChange,
  className,
}: FilterMenuProps): JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openField, setOpenField] = useState<string | null>(null);
  const draftRef = useRef<FilterCondition | null>(null);
  const open = openProp ?? uncontrolledOpen;

  // 面板关闭无改动就不提交：否则每次开合都会重写 URL 把 page 复位到 1（review A3）
  const commitField = (fieldKey: string, draft: FilterCondition | null) => {
    const next = upsertCondition(value, fieldKey, commitFilterValue(draft));
    if (isSameFilterRoot(next, value)) return;
    onChange(next);
  };

  // 整个菜单收起（不再提交草稿：调用方已提交或确认无草稿）
  const closeMenu = () => {
    if (openProp === undefined) setUncontrolledOpen(false);
    setOpenField(null);
    setQuery('');
    onOpenChange?.(false);
  };

  const setOpen = (next: boolean) => {
    if (!next) {
      // 点空白处时 Radix 会先关外层：内层值面板随之被卸载而**不会**走自己的 onOpenChange(false)，
      // 草稿就丢了——「关闭面板即生效」形同虚设。外层关闭前先替内层把草稿提交掉。
      if (openField) commitField(openField, draftRef.current);
      closeMenu();
      return;
    }
    if (openProp === undefined) setUncontrolledOpen(true);
    onOpenChange?.(true);
  };

  const visibleFields = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const activeFields = activeFieldKeys(value);
    const sorted = fields
      .filter((field) => !activeFields.has(field.key))
      .sort((left, right) => Number(Boolean(right.quick)) - Number(Boolean(left.quick)));
    if (!needle) return sorted;
    return sorted.filter((field) => field.label.toLowerCase().includes(needle));
  }, [fields, query, value]);

  const visibleSchemes = useMemo(() => {
    const mine = (schemes ?? []).filter((scheme) => scheme.scope !== 'shared');
    const needle = query.trim().toLowerCase();
    if (!needle) return mine;
    return mine.filter((scheme) => scheme.name.toLowerCase().includes(needle));
  }, [query, schemes]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          data-slot="filter-menu-trigger"
          data-active={activeCount > 0 || undefined}
          className={cn(
            className,
            activeCount > 0 &&
              'border-(--filter-chip-border-active) bg-(--fill-selected) text-(--table-action-fg) hover:bg-(--fill-selected)',
            open && activeCount === 0 && 'bg-(--surface-2)',
          )}
        >
          <Funnel data-icon="inline-start" aria-hidden="true" />
          {labels.trigger}
          {activeCount > 0 && (
            <span data-slot="filter-menu-count" className="font-mono text-[calc(12px*var(--app-scale))]">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        data-slot="filter-menu"
        className="w-(--filter-menu-w) p-0"
      >
        <div className="border-b border-(--overlay-border)">
          <Input
            type="text"
            value={query}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            data-variant="embedded"
            className="h-[calc(30px*var(--app-scale))] rounded-none border-0 bg-transparent shadow-none"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {visibleSchemes.length > 0 && (
          <section data-slot="filter-menu-schemes" className="py-[calc(6px*var(--app-scale))]">
            <p className="px-[calc(12px*var(--app-scale))] py-[calc(4px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--text-3)">
              {labels.schemesTitle}
            </p>
            {visibleSchemes.map((scheme) => (
              <button
                key={scheme.id}
                type="button"
                data-slot="filter-menu-scheme"
                data-active={scheme.id === activeSchemeId || undefined}
                className="flex h-[calc(32px*var(--app-scale))] w-full cursor-pointer items-center gap-[calc(8px*var(--app-scale))] px-[calc(12px*var(--app-scale))] text-left text-[calc(13px*var(--app-scale))] hover:bg-(--menu-item-bg-highlighted)"
                onClick={() => {
                  onApplyScheme?.(scheme.id);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{scheme.name}</span>
                <span className="text-[calc(11.5px*var(--app-scale))] text-(--text-3)">
                  {labels.conditionCount(scheme.conditionCount)}
                </span>
                {scheme.id === activeSchemeId ? (
                  <Check className="size-[calc(14px*var(--app-scale))] text-(--table-action-fg)" />
                ) : (
                  <ChevronRight className="size-[calc(14px*var(--app-scale))] text-(--text-3)" />
                )}
              </button>
            ))}
          </section>
        )}

        {visibleSchemes.length > 0 && <div className="h-px bg-(--overlay-border)" />}

        <section data-slot="filter-menu-fields" className="py-[calc(6px*var(--app-scale))]">
          <p className="px-[calc(12px*var(--app-scale))] py-[calc(4px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--text-3)">
            {labels.fieldsTitle}
          </p>
          {visibleFields.map((field) => (
            <Popover
              key={field.key}
              open={openField === field.key}
              onOpenChange={(next) => {
                if (next) {
                  draftRef.current = conditionForField(value, field.key);
                  setOpenField(field.key);
                  return;
                }
                commitField(field.key, draftRef.current);
                setOpenField(null);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-slot="filter-menu-field"
                  className="flex h-[calc(32px*var(--app-scale))] w-full cursor-pointer items-center justify-between px-[calc(12px*var(--app-scale))] text-left text-[calc(13px*var(--app-scale))] hover:bg-(--menu-item-bg-highlighted) data-[state=open]:bg-(--menu-item-bg-highlighted)"
                >
                  {field.label}
                  <ChevronRight className="size-[calc(14px*var(--app-scale))] text-(--text-3)" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={6}
                data-slot="filter-value-popover"
                className="w-(--filter-panel-w) p-0"
                // Enter = 确认并关闭值面板（tree / dateRange 面板自身只更新草稿；text 面板已在输入框内处理 Enter）。
                // 子面板的 Enter 先跑（树面板用它选中高亮项并同步草稿），冒泡到这里再整体提交。
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || field.input === 'text') return;
                  if ((event.target as HTMLElement).tagName === 'TEXTAREA') return;
                  event.preventDefault();
                  commitField(field.key, draftRef.current);
                  // 确认即整菜单收起：只关二级面板会让人以为没生效
                  closeMenu();
                }}
              >
                <FilterValuePanel
                  field={field}
                  condition={conditionForField(value, field.key)}
                  labels={panelLabels}
                  onCommit={(next) => {
                    draftRef.current = next;
                    // 单选点即提交 / 文本 Enter 提交：整菜单一起收起，筛选立刻可见
                    if (field.input === 'select' || field.input === 'text') {
                      commitField(field.key, next);
                      closeMenu();
                    }
                  }}
                  onDraftChange={(next) => {
                    draftRef.current = next;
                  }}
                />
              </PopoverContent>
            </Popover>
          ))}
        </section>

        {onOpenAdvanced && (
          <>
            <div className="h-px bg-(--overlay-border)" />
            <button
              type="button"
              data-slot="filter-menu-advanced"
              className="flex h-[calc(36px*var(--app-scale))] w-full cursor-pointer items-center gap-[calc(8px*var(--app-scale))] px-[calc(12px*var(--app-scale))] text-[calc(13px*var(--app-scale))] text-(--type-2-fg) hover:bg-(--menu-item-bg-highlighted)"
              onClick={() => {
                setOpen(false);
                onOpenAdvanced();
              }}
            >
              <SlidersHorizontal className="size-[calc(14px*var(--app-scale))]" />
              {labels.advanced}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
