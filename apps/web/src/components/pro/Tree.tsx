import {
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TreeNode {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  depth: number;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  expandable?: boolean;
  expanded?: boolean;
  toggleLabel?: string;
  hidden?: boolean;
}
export interface TreeProps {
  nodes: TreeNode[];
  variant?: 'default' | 'management' | 'compact';
  selectedId?: string;
  onSelect: (id: string) => void;
  onToggle?: (id: string) => void;
  ariaLabel: string;
  empty?: ReactNode;
}

const indentStep = 18;
const baseIndent = 12;
const compactIndentStep = 16;
const compactBaseIndent = 8;

function textFromNode(node: ReactNode): string | undefined {
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return String(node);
  if (Array.isArray(node)) {
    const parts = node.map(textFromNode).filter((part): part is string => !!part);
    return parts.length > 0 ? parts.join('') : undefined;
  }
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return undefined;
}

function treeItemAriaLabel(node: TreeNode): string | undefined {
  const label = textFromNode(node.label);
  if (!label) return undefined;
  const description = textFromNode(node.description);
  const meta = textFromNode(node.meta);
  return [label, description, meta].filter(Boolean).join(' ');
}

export function Tree({
  nodes,
  variant = 'default',
  selectedId,
  onSelect,
  onToggle,
  ariaLabel,
  empty,
}: TreeProps): JSX.Element {
  const [focusedId, setFocusedId] = useState<string>();
  const treeRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusWithin = useRef(false);
  // 输入为前序扁平树；折叠状态也在此收敛，隐藏后代保留独立折叠动画。
  const ancestors: TreeNode[] = [];
  const parentIds = new Map<string, string>();
  const hiddenIds = new Set<string>();
  for (const node of nodes) {
    while (ancestors.length && ancestors[ancestors.length - 1]!.depth >= node.depth) ancestors.pop();
    const parent = ancestors[ancestors.length - 1];
    if (parent) parentIds.set(node.id, parent.id);
    if (
      node.hidden ||
      ancestors.some((ancestor) => ancestor.hidden || (ancestor.expandable && !ancestor.expanded))
    ) {
      hiddenIds.add(node.id);
    }
    ancestors.push(node);
  }
  const visibleNodes = nodes.filter((node) => !hiddenIds.has(node.id));
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  let activeId = focusedId;
  while (activeId && !visibleIds.has(activeId)) activeId = parentIds.get(activeId);
  activeId ??= selectedId && visibleIds.has(selectedId) ? selectedId : visibleNodes[0]?.id;

  useLayoutEffect(() => {
    if (focusWithin.current && activeId) {
      const activeItem = itemRefs.current.get(activeId);
      if (activeItem && document.activeElement !== activeItem) activeItem.focus();
    }
  }, [activeId]);

  const focusNode = (id: string | undefined) => {
    if (id) itemRefs.current.get(id)?.focus();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, node: TreeNode) => {
    const index = visibleNodes.findIndex((item) => item.id === node.id);
    const nextNode = visibleNodes[index + 1];
    switch (event.key) {
      case 'ArrowDown':
        focusNode(visibleNodes[index + 1]?.id);
        break;
      case 'ArrowUp':
        focusNode(visibleNodes[index - 1]?.id);
        break;
      case 'Home':
        focusNode(visibleNodes[0]?.id);
        break;
      case 'End':
        focusNode(visibleNodes[visibleNodes.length - 1]?.id);
        break;
      case 'ArrowRight':
        if (node.expandable && !node.expanded) onToggle?.(node.id);
        else if (nextNode && nextNode.depth > node.depth) focusNode(nextNode.id);
        break;
      case 'ArrowLeft':
        if (node.expandable && node.expanded) onToggle?.(node.id);
        else focusNode(parentIds.get(node.id));
        break;
      default:
        return; // Enter / Space 交给原生 button 激活，焦点移动不改变选择。
    }
    event.preventDefault();
  };

  if (nodes.length === 0) {
    return (
      <div data-slot="tree-empty" className="flex min-h-64 items-center justify-center text-sm text-text-3">
        {empty}
      </div>
    );
  }

  return (
    <div
      ref={treeRef}
      role="tree"
      onFocusCapture={() => {
        focusWithin.current = true;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) focusWithin.current = false;
      }}
      aria-label={ariaLabel}
      data-variant={variant}
      className={cn(
        'grid',
        variant === 'default' && 'gap-1',
        variant === 'compact' && 'gap-px',
        variant === 'management' &&
          'overflow-hidden rounded-10 border border-(--table-border) bg-(--table-bg)',
      )}
    >
      {nodes.map((node, index) => {
        const selected = node.id === selectedId;
        const hidden = hiddenIds.has(node.id);
        const itemAriaLabel = treeItemAriaLabel(node);

        return (
          <div
            key={node.id}
            data-tree-row
            data-collapsed-hidden={hidden || undefined}
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
              hidden ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                data-slot="tree-row-surface"
                aria-hidden={hidden || undefined}
                inert={hidden || undefined}
                // compact：缩进落在整行（箭头随层级走，叶子用同宽占位对齐文字），行高 30、圆角 4
                style={
                  variant === 'compact'
                    ? {
                        paddingLeft: `calc(${compactBaseIndent + node.depth * compactIndentStep}px * var(--app-scale))`,
                      }
                    : undefined
                }
                className={cn(
                  'group/tree-row flex items-center',
                  variant !== 'compact' && 'px-1',
                  variant === 'default' && 'min-h-[calc(44px*var(--app-scale))] rounded-8',
                  variant === 'compact' && 'min-h-[calc(30px*var(--app-scale))] gap-1.5 rounded-4 pr-2',
                  variant === 'management' && 'min-h-[calc(54px*var(--app-scale))]',
                  variant === 'management' &&
                    index < nodes.length - 1 &&
                    'border-b border-(--table-row-border)',
                  selected ? 'bg-(--side-list-item-bg-active)' : 'hover:bg-(--side-list-item-bg-hover)',
                  hidden && 'pointer-events-none',
                )}
              >
                {node.expandable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={cn(variant === 'compact' && 'size-[calc(16px*var(--app-scale))] shrink-0')}
                    tabIndex={-1}
                    aria-label={node.toggleLabel}
                    aria-expanded={node.expanded}
                    onClick={() => {
                      focusNode(node.id);
                      onToggle?.(node.id);
                    }}
                  >
                    <ChevronDown
                      data-icon="inline"
                      className={cn(
                        'transition-transform duration-200 motion-reduce:transition-none',
                        !node.expanded && '-rotate-90',
                      )}
                    />
                  </Button>
                ) : variant === 'compact' && node.leading ? null : (
                  <span
                    className={cn(
                      'shrink-0',
                      variant === 'compact'
                        ? 'size-[calc(16px*var(--app-scale))]'
                        : 'size-[calc(24px*var(--app-scale))]',
                    )}
                    aria-hidden="true"
                  />
                )}

                <button
                  type="button"
                  role="treeitem"
                  ref={(element) => {
                    if (element) itemRefs.current.set(node.id, element);
                    else itemRefs.current.delete(node.id);
                  }}
                  tabIndex={!hidden && node.id === activeId ? 0 : -1}
                  aria-expanded={node.expandable ? !!node.expanded : undefined}
                  onFocus={() => setFocusedId(node.id)}
                  onKeyDown={(event) => handleKeyDown(event, node)}
                  aria-level={node.depth + 1}
                  aria-label={itemAriaLabel}
                  aria-selected={selected}
                  className={cn(
                    'flex min-w-0 flex-1 items-center rounded-8 text-left text-sm outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring) focus-visible:ring-inset',
                    variant === 'compact' ? 'gap-1.5' : 'gap-2 pr-2',
                    variant === 'default' && 'min-h-[calc(36px*var(--app-scale))]',
                    variant === 'compact' && 'min-h-[calc(30px*var(--app-scale))] rounded-4',
                    variant === 'management' && 'min-h-[calc(46px*var(--app-scale))]',
                    selected
                      ? 'font-semibold text-(--side-list-item-fg-active)'
                      : variant === 'management'
                        ? 'text-text'
                        : 'text-(--tree-item-fg)',
                  )}
                  style={
                    variant === 'compact'
                      ? undefined
                      : { paddingLeft: `calc(${baseIndent + node.depth * indentStep}px * var(--app-scale))` }
                  }
                  onClick={() => onSelect(node.id)}
                >
                  {node.leading && (
                    <span
                      data-slot="tree-leading"
                      className={cn(
                        'flex shrink-0 items-center justify-center',
                        variant === 'compact'
                          ? 'size-[calc(14px*var(--app-scale))]'
                          : 'size-8 rounded-8 bg-(--pro-panel-bg)',
                        selected ? 'text-(--nav-item-fg-current)' : 'text-(--tree-item-fg)',
                      )}
                    >
                      {node.leading}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{node.label}</span>
                    {node.description ? (
                      <span
                        data-slot="tree-description"
                        className={cn(
                          'mt-0.5 block truncate text-xs font-normal text-(--type-3-fg)',
                          selected && 'text-(--side-list-item-meta-fg-active)',
                        )}
                      >
                        {node.description}
                      </span>
                    ) : null}
                  </span>
                  {node.meta && (
                    <span
                      className={cn(
                        'shrink-0 text-xs text-(--tree-meta-fg)',
                        variant === 'compact' &&
                          'font-mono text-[calc(11.5px*var(--app-scale))] tabular-nums',
                        selected && 'text-(--side-list-item-meta-fg-active)',
                      )}
                    >
                      {node.meta}
                    </span>
                  )}
                </button>

                {node.trailing && (
                  <span data-slot="tree-trailing" className="flex shrink-0 items-center gap-1.5 pr-2">
                    {node.trailing}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
