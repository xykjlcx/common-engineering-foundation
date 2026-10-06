import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PickerNode {
  value: string;
  label: string;
  /** 父节点 value；null / undefined 为根 */
  parentValue?: string | null;

  code?: string;
  /** 右侧「常用」标记 */
  frequent?: boolean;

  meta?: string;
  disabled?: boolean;
}

export interface PickerPopoverLabels {
  searchPlaceholder: string;
  frequent: string;
  recent?: string;
  matchHint: (query: string, count: number) => string;
  empty: string;
  create?: (query: string) => string;
  hints?: string[];
  more?: (count: number) => string;
}

/** 模式与值、回调绑定；多选接受只读输入，每次回调提供新数组。 */
export type PickerSelectionProps =
  | { multiple?: false; value: string | null; onChange: (value: string | null) => void }
  | { multiple: true; value: readonly string[]; onChange: (value: string[]) => void };

interface PickerPanelBaseProps {
  nodes: PickerNode[];
  /** compact：与弹窗内表单控件同档（30px 行、28px 搜索框），用于筛选值面板；默认 36px 行供独立选择器使用 */
  density?: 'default' | 'compact';
  /** inline：直接嵌进表单 / 弹窗，自带细边框与圆角，不画底部提示栏 */
  appearance?: 'popover' | 'inline';
  /** 每行前画勾选框（多选）或单选圈（单选），选中态用品牌色，而不是只靠底色 */
  indicator?: boolean;
  recent?: string[];
  onCreate?: (query: string) => void;
  labels: PickerPopoverLabels;
  'aria-label': string;
  autoFocus?: boolean;
  defaultQuery?: string;
  query?: string;
  onQueryChange?: (query: string) => void;
  searchMode?: 'local' | 'remote';
  busy?: boolean;
  footer?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export type PickerPanelProps = PickerPanelBaseProps & PickerSelectionProps;

const indentStep = 18;
const baseIndent = 14;
const compactBaseIndent = 10;

function toArray(value: string | readonly string[] | null): readonly string[] {
  return typeof value === 'string' ? [value] : (value ?? []);
}

interface FlatRow {
  node: PickerNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

function buildChildrenMap(nodes: PickerNode[]) {
  const map = new Map<string, PickerNode[]>();
  for (const node of nodes) {
    const key = node.parentValue ?? '';
    const bucket = map.get(key);
    if (bucket) bucket.push(node);
    else map.set(key, [node]);
  }
  return map;
}

function flattenTree(nodes: PickerNode[], collapsed: ReadonlySet<string>): FlatRow[] {
  const childrenMap = buildChildrenMap(nodes);
  const rows: FlatRow[] = [];

  const walk = (parentKey: string, depth: number) => {
    for (const node of childrenMap.get(parentKey) ?? []) {
      const children = childrenMap.get(node.value) ?? [];
      const expanded = !collapsed.has(node.value);
      rows.push({ node, depth, hasChildren: children.length > 0, expanded });
      if (children.length > 0 && expanded) walk(node.value, depth + 1);
    }
  };

  walk('', 0);
  return rows;
}

function flattenMatches(nodes: PickerNode[], query: string): FlatRow[] {
  const needle = query.trim().toLowerCase();
  return nodes
    .filter(
      (node) => node.label.toLowerCase().includes(needle) || (node.code ?? '').toLowerCase().includes(needle),
    )
    .map((node) => ({ node, depth: 0, hasChildren: false, expanded: true }));
}

function highlight(label: string, query: string): ReactNode {
  const needle = query.trim();
  if (!needle) return label;
  const index = label.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return label;

  return (
    <>
      {label.slice(0, index)}
      <span data-slot="picker-highlight" className="text-(--button-link-fg)">
        {label.slice(index, index + needle.length)}
      </span>
      {label.slice(index + needle.length)}
    </>
  );
}

/** PickerPopover 的面板体：搜索 + 树 / 扁平匹配 + 键盘导航。筛选二级面板与选择器共用。 */
export function PickerPanel(props: PickerPanelProps): JSX.Element {
  const {
    nodes,
    value,
    recent,
    onCreate,
    labels,
    autoFocus = false,
    defaultQuery = '',
    onClose,
    className,
    density = 'default',
    appearance = 'popover',
    indicator = false,
    'aria-label': ariaLabel,
  } = props;
  const compact = density === 'compact';
  const insetX = compact ? 'px-[calc(10px*var(--app-scale))]' : 'px-[calc(14px*var(--app-scale))]';
  const rowHeight = compact ? 'h-[calc(30px*var(--app-scale))]' : 'h-[calc(36px*var(--app-scale))]';
  const multiple = props.multiple === true;
  const [localQuery, setLocalQuery] = useState(defaultQuery);
  const query = props.query ?? localQuery;
  const setQuery = (next: string) => {
    setLocalQuery(next);
    props.onQueryChange?.(next);
  };
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => toArray(value), [value]);
  const searching = query.trim().length > 0;
  const rows = useMemo(
    () =>
      searching && props.searchMode !== 'remote'
        ? flattenMatches(nodes, query)
        : flattenTree(nodes, collapsed),
    [collapsed, nodes, query, searching, props.searchMode],
  );
  const byValue = useMemo(() => new Map(nodes.map((node) => [node.value, node])), [nodes]);
  const selectableIndexes = useMemo(
    () => rows.map((row, index) => (row.node.disabled ? -1 : index)).filter((index) => index >= 0),
    [rows],
  );

  const activeIndex = useMemo(() => {
    const byActive = activeValue
      ? rows.findIndex((row) => row.node.value === activeValue && !row.node.disabled)
      : -1;
    return byActive >= 0 ? byActive : (selectableIndexes[0] ?? -1);
  }, [activeValue, rows, selectableIndexes]);

  const commit = useCallback(
    (node: PickerNode) => {
      if (node.disabled) return;
      if (!props.multiple) {
        props.onChange(node.value);
        onClose?.();
        return;
      }
      const next = selected.includes(node.value)
        ? selected.filter((item) => item !== node.value)
        : [...selected, node.value];
      props.onChange(next);
    },
    [props, onClose, selected],
  );

  const moveActive = useCallback(
    (delta: number) => {
      if (selectableIndexes.length === 0) return;
      const current = selectableIndexes.indexOf(activeIndex);
      const nextPosition =
        current < 0 ? 0 : (current + delta + selectableIndexes.length) % selectableIndexes.length;
      const nextIndex = selectableIndexes[nextPosition];
      setActiveValue(nextIndex === undefined ? null : (rows[nextIndex]?.node.value ?? null));
    },
    [activeIndex, rows, selectableIndexes],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const row = rows[activeIndex];
      if (row) commit(row.node);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
    }
  };

  const toggleCollapsed = (nodeValue: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(nodeValue)) next.delete(nodeValue);
      else next.add(nodeValue);
      return next;
    });
  };

  const anyChildren = rows.some((row) => row.hasChildren);

  const recentNodes = (recent ?? [])
    .map((item) => byValue.get(item))
    .filter((node): node is PickerNode => !!node);

  return (
    <div
      data-slot="picker-panel"
      data-appearance={appearance}
      className={cn(
        appearance === 'inline' &&
          'overflow-hidden rounded-8 border border-(--field-border-hover) bg-(--field-bg-focus)',
        className,
      )}
    >
      <div className="border-b border-(--overlay-border)">
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-expanded
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            rows[activeIndex] ? `${listboxId}-${rows[activeIndex].node.value}` : undefined
          }
          value={query}
          placeholder={labels.searchPlaceholder}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          data-variant="embedded"
          inputSize={compact ? 'sm' : 'md'}
          className={cn(
            'rounded-none border-0 bg-transparent text-[calc(13px*var(--app-scale))] shadow-none',
            insetX,
          )}
        />
      </div>

      {recentNodes.length > 0 && (
        <div
          data-slot="picker-recent"
          className={cn(
            'flex flex-wrap items-center gap-[calc(7px*var(--app-scale))] pt-[calc(9px*var(--app-scale))] pb-[calc(8px*var(--app-scale))]',
            insetX,
          )}
        >
          <span className="text-[calc(11.5px*var(--app-scale))] text-(--picker-hint-fg)">
            {labels.recent}
          </span>
          {recentNodes.map((node) => (
            <button
              key={node.value}
              type="button"
              data-slot="picker-recent-chip"
              onClick={() => commit(node)}
              className="flex h-[calc(24px*var(--app-scale))] cursor-pointer items-center gap-[calc(6px*var(--app-scale))] rounded-md bg-(--picker-recent-chip-bg) px-[calc(9px*var(--app-scale))] text-[calc(12px*var(--app-scale))]"
            >
              {node.code && (
                <span className="font-mono text-[calc(11px*var(--app-scale))] text-(--text-3)">
                  {node.code}
                </span>
              )}
              <span className="text-(--chip-fg)">{node.label}</span>
            </button>
          ))}
        </div>
      )}

      {searching && (
        <div
          data-slot="picker-match-hint"
          className={cn(
            'pb-[calc(6px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--picker-hint-fg)',
            insetX,
          )}
        >
          {labels.matchHint(query, rows.length)}
        </div>
      )}

      <ul
        id={listboxId}
        role="listbox"
        aria-busy={props.busy || undefined}
        aria-label={ariaLabel}
        aria-multiselectable={multiple || undefined}
        data-slot="picker-list"
        className={cn(
          'overflow-y-auto',
          compact ? 'max-h-[calc(228px*var(--app-scale))]' : 'max-h-[calc(288px*var(--app-scale))]',
        )}
      >
        {rows.length === 0 && (
          <li
            data-slot="picker-empty"
            className={cn(
              'flex items-center text-[calc(13px*var(--app-scale))] text-(--text-3)',
              rowHeight,
              insetX,
            )}
          >
            {labels.empty}
          </li>
        )}
        {rows.map((row, index) => {
          const isSelected = selected.includes(row.node.value);
          const isActive = index === activeIndex;

          return (
            <li
              key={row.node.value}
              id={`${listboxId}-${row.node.value}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={row.node.disabled || undefined}
              data-slot="picker-option"
              data-active={isActive || undefined}
              data-selected={isSelected || undefined}
              onMouseEnter={() => !row.node.disabled && setActiveValue(row.node.value)}
              onClick={() => commit(row.node)}
              style={{
                paddingLeft: `calc(${(compact ? compactBaseIndent : baseIndent) + row.depth * indentStep}px * var(--app-scale))`,
              }}
              className={cn(
                'flex cursor-pointer items-center gap-[calc(9px*var(--app-scale))] text-[calc(13px*var(--app-scale))] text-(--option-fg)',
                rowHeight,
                compact ? 'pr-[calc(10px*var(--app-scale))]' : 'pr-[calc(14px*var(--app-scale))]',
                'data-[active]:bg-(--option-bg-highlighted)',
                'data-[selected]:bg-(--option-bg-selected) data-[selected]:text-(--option-fg-selected)',
                'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
              )}
            >
              {!searching && (!indicator || anyChildren) && (
                <span
                  data-slot="picker-toggle"
                  role={row.hasChildren ? 'button' : undefined}
                  aria-label={row.hasChildren ? row.node.label : undefined}
                  aria-expanded={row.hasChildren ? row.expanded : undefined}
                  onClick={(event) => {
                    if (!row.hasChildren) return;
                    event.stopPropagation();
                    toggleCollapsed(row.node.value);
                  }}
                  className="flex size-[calc(14px*var(--app-scale))] shrink-0 items-center justify-center text-(--text-3)"
                >
                  {row.hasChildren &&
                    (row.expanded ? (
                      <ChevronDown aria-hidden="true" className="size-full" />
                    ) : (
                      <ChevronRight aria-hidden="true" className="size-full" />
                    ))}
                </span>
              )}
              {indicator && (
                <span
                  aria-hidden="true"
                  data-slot="picker-choice"
                  data-checked={isSelected || undefined}
                  className={cn(
                    'flex size-[var(--choice-size)] shrink-0 items-center justify-center border border-(--choice-border) bg-(--choice-bg) text-(--choice-fg-checked)',
                    multiple ? 'rounded-4' : 'rounded-full',
                    'data-[checked]:border-(--choice-border-checked) data-[checked]:bg-(--choice-bg-checked)',
                  )}
                >
                  {isSelected &&
                    (multiple ? (
                      <Check className="size-[calc(10px*var(--app-scale))] stroke-[3px]" />
                    ) : (
                      <span className="size-[calc(6px*var(--app-scale))] rounded-full bg-current" />
                    ))}
                </span>
              )}
              {row.node.code && (
                <span className="w-[calc(58px*var(--app-scale))] shrink-0 font-mono text-[calc(12px*var(--app-scale))] text-(--text-3)">
                  {row.node.code}
                </span>
              )}
              <span className="truncate">{highlight(row.node.label, query)}</span>
              <span className="flex-1" />
              {row.node.frequent && (
                <span
                  data-slot="picker-frequent"
                  className="shrink-0 text-[calc(10.5px*var(--app-scale))] text-(--button-link-fg)"
                >
                  {labels.frequent}
                </span>
              )}
              {row.node.meta && (
                <span
                  data-slot="picker-meta"
                  className="flex h-[calc(17px*var(--app-scale))] shrink-0 items-center rounded-(--badge-radius) bg-(--badge-neutral-bg) px-[calc(6px*var(--app-scale))] text-[calc(10.5px*var(--app-scale))] text-(--text-3)"
                >
                  {row.node.meta}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {props.footer ? (
        <div data-slot="picker-remote-feedback" className="px-3 py-2" aria-live="polite">
          {props.footer}
        </div>
      ) : null}
      {appearance !== 'inline' && (
        <div
          data-slot="picker-footer"
          className={cn(
            'flex items-center gap-[calc(12px*var(--app-scale))] border-t border-(--picker-footer-border) bg-(--picker-footer-bg) text-[calc(11.5px*var(--app-scale))] text-(--picker-footer-fg)',
            compact ? 'h-[calc(28px*var(--app-scale))]' : 'h-[calc(34px*var(--app-scale))]',
            insetX,
          )}
        >
          {onCreate && (
            <button
              type="button"
              data-slot="picker-create"
              onClick={() => onCreate(query)}
              className="flex cursor-pointer items-center gap-[calc(5px*var(--app-scale))] text-[calc(12px*var(--app-scale))] text-(--button-link-fg)"
            >
              <Plus aria-hidden="true" className="size-[calc(12px*var(--app-scale))]" />
              {labels.create?.(query)}
            </button>
          )}
          <span className="flex-1" />
          {(labels.hints ?? []).map((hint) => (
            <span key={hint}>{hint}</span>
          ))}
        </div>
      )}
    </div>
  );
}
