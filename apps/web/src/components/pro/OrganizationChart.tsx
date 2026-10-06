import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface OrganizationChartNode {
  id: string;
  parentId: string | null;
  label: string;
  description: string;
  meta: string;
  leading?: ReactNode;
  unavailable?: boolean;
}

interface PlacedNode {
  node: OrganizationChartNode;
  x: number;
  y: number;
  depth: number;
  children: string[];
}
const WIDTH = 176;
const HEIGHT = 100;
const GAP = 24;
const LEVEL = 168;
const PADDING = 28;
const px = (value: number) => `calc(${value}px * var(--app-scale))`;

function revealNode(scroller: HTMLDivElement, node: HTMLButtonElement | undefined) {
  if (!node) return;
  const viewport = scroller.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  scroller.scrollLeft += rect.left - viewport.left - (scroller.clientWidth - rect.width) / 2;
  if (scroller.clientWidth < 500) scroller.scrollTop += rect.top - viewport.top - 12;
  else if (rect.top < viewport.top || rect.bottom > viewport.bottom)
    scroller.scrollTop += rect.top - viewport.top - 12;
}

function placeNodes(nodes: readonly OrganizationChartNode[], collapsed: ReadonlySet<string>) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string | null, OrganizationChartNode[]>();
  for (const node of nodes) {
    const parent = node.parentId && byId.has(node.parentId) ? node.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), node]);
  }
  const placed: PlacedNode[] = [];
  const seen = new Set<string>();
  let cursor = PADDING;
  const visit = (node: OrganizationChartNode, depth: number): PlacedNode => {
    seen.add(node.id);
    const childNodes = (children.get(node.id) ?? []).filter((child) => !seen.has(child.id));
    const item: PlacedNode = {
      node,
      x: 0,
      y: PADDING + depth * LEVEL,
      depth,
      children: childNodes.map((child) => child.id),
    };
    placed.push(item);
    const visibleChildren = collapsed.has(node.id) ? [] : childNodes.map((child) => visit(child, depth + 1));
    if (visibleChildren.length) {
      item.x = ((visibleChildren[0]?.x ?? 0) + (visibleChildren.at(-1)?.x ?? 0)) / 2;
    } else {
      item.x = cursor;
      cursor += WIDTH + GAP;
    }
    return item;
  };
  for (const root of children.get(null) ?? []) if (!seen.has(root.id)) visit(root, 0);
  return {
    placed,
    width: Math.max(300, cursor - GAP + PADDING),
    height: Math.max(360, ...placed.map((item) => item.y + HEIGHT + PADDING)),
  };
}

export function OrganizationChart({
  nodes,
  selectedId,
  onSelect,
  toolbar,
  scopeKey = '',
  labels,
}: {
  nodes: readonly OrganizationChartNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  toolbar?: ReactNode;
  scopeKey?: string;
  labels: {
    tree: string;
    empty: string;
    hint: string;
    zoomIn: string;
    zoomOut: string;
    reset: string;
    expand: (name: string) => string;
    collapse: (name: string) => string;
  };
}) {
  const [collapseState, setCollapseState] = useState({ scope: scopeKey, ids: new Set<string>() });
  const collapsed = collapseState.scope === scopeKey ? collapseState.ids : new Set<string>();
  const [scale, setScale] = useState(1);
  const [focusedId, setFocusedId] = useState<string | undefined>();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const scroller = useRef<HTMLDivElement>(null);
  const layout = placeNodes(nodes, collapsed);
  const byId = new Map(layout.placed.map((item) => [item.node.id, item]));
  const revealId = selectedId && byId.has(selectedId) ? selectedId : layout.placed[0]?.node.id;
  useLayoutEffect(() => {
    const viewport = scroller.current;
    if (!viewport || !revealId) return;
    const reveal = () => revealNode(viewport, buttons.current.get(revealId));
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [revealId, scopeKey, layout.width, layout.height, scale]);
  const tabId =
    focusedId && byId.has(focusedId)
      ? focusedId
      : selectedId && byId.has(selectedId)
        ? selectedId
        : layout.placed[0]?.node.id;
  const toggle = (id: string) => {
    const ids = new Set(collapsed);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    setCollapseState({ scope: scopeKey, ids });
  };
  const focus = (id: string | undefined) => {
    if (!id) return;
    setFocusedId(id);
    buttons.current.get(id)?.focus();
  };
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>, item: PlacedNode, index: number) => {
    const id = item.node.id;
    switch (event.key) {
      case 'ArrowDown':
        focus(layout.placed[index + 1]?.node.id);
        break;
      case 'ArrowUp':
        focus(layout.placed[index - 1]?.node.id);
        break;
      case 'Home':
        focus(layout.placed[0]?.node.id);
        break;
      case 'End':
        focus(layout.placed.at(-1)?.node.id);
        break;
      case 'ArrowRight':
        if (item.children.length && collapsed.has(id)) toggle(id);
        else focus(item.children[0]);
        break;
      case 'ArrowLeft':
        if (item.children.length && !collapsed.has(id)) toggle(id);
        else focus(item.node.parentId ?? undefined);
        break;
      case 'Enter':
      case ' ':
        onSelect(id);
        break;
      default:
        return;
    }
    event.preventDefault();
  };
  return (
    <section
      data-slot="organization-chart"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-(--pro-org-border) bg-(--pro-org-bg)"
    >
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-(--pro-org-border) p-3">
          {toolbar}
        </div>
      ) : null}
      <div
        ref={scroller}
        className="max-h-[calc(440px*var(--app-scale))] min-h-[calc(440px*var(--app-scale))] flex-1 overflow-auto p-3 xl:max-h-none"
        role="tree"
        aria-label={labels.tree}
      >
        {nodes.length ? (
          <div
            className="relative mx-auto"
            style={{ width: px(layout.width * scale), height: px(layout.height * scale) }}
          >
            <div
              className="absolute origin-top-left"
              style={{ width: px(layout.width), height: px(layout.height), transform: `scale(${scale})` }}
            >
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full text-(--pro-org-connector)"
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
              >
                {layout.placed.flatMap((parent) =>
                  collapsed.has(parent.node.id)
                    ? []
                    : parent.children.flatMap((id) => {
                        const child = byId.get(id);
                        if (!child) return [];
                        const x1 = parent.x + WIDTH / 2,
                          y1 = parent.y + HEIGHT;
                        const x2 = child.x + WIDTH / 2,
                          y2 = child.y;
                        const middle = (y1 + y2) / 2;
                        return [<path key={id} d={`M${x1} ${y1}V${middle}H${x2}V${y2}`} />];
                      }),
                )}
              </svg>
              {layout.placed.map((item, index) => (
                <div
                  key={item.node.id}
                  className="absolute"
                  style={{ left: px(item.x), top: px(item.y), width: px(WIDTH), height: px(HEIGHT) }}
                >
                  <button
                    ref={(element) => {
                      if (element) buttons.current.set(item.node.id, element);
                      else buttons.current.delete(item.node.id);
                    }}
                    type="button"
                    role="treeitem"
                    aria-label={item.node.label}
                    aria-level={item.depth + 1}
                    aria-selected={item.node.id === selectedId}
                    aria-expanded={item.children.length ? !collapsed.has(item.node.id) : undefined}
                    tabIndex={item.node.id === tabId ? 0 : -1}
                    onFocus={() => setFocusedId(item.node.id)}
                    onClick={() => onSelect(item.node.id)}
                    onKeyDown={(event) => keyDown(event, item, index)}
                    data-unavailable={item.node.unavailable || undefined}
                    className={cn(
                      'flex h-full w-full cursor-pointer flex-col gap-2 rounded-lg border border-(--pro-org-node-border) bg-(--pro-org-node-bg) p-3 text-left text-(--pro-org-node-fg) outline-none hover:bg-(--pro-org-node-hover) focus-visible:ring-2 focus-visible:ring-(--pro-org-focus) data-[unavailable=true]:text-(--pro-org-muted)',
                      item.node.id === selectedId &&
                        'border-(--pro-org-selected-border) bg-(--pro-org-selected-bg)',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-xs">
                      {item.node.leading ? (
                        <span className="shrink-0 text-(--pro-org-icon)">{item.node.leading}</span>
                      ) : null}
                      <span className={cn('truncate', item.node.id === selectedId && 'font-medium')}>
                        {item.node.label}
                      </span>
                    </span>
                    <span className="text-[calc(11px*var(--app-scale))] text-(--pro-org-meta)">
                      {item.node.meta}
                    </span>
                    <span className="text-[calc(10.5px*var(--app-scale))] text-(--pro-org-meta)">
                      {item.node.description}
                    </span>
                  </button>
                  {item.children.length ? (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="absolute right-1 bottom-1"
                      aria-label={
                        collapsed.has(item.node.id)
                          ? labels.expand(item.node.label)
                          : labels.collapse(item.node.label)
                      }
                      onClick={() => toggle(item.node.id)}
                    >
                      {collapsed.has(item.node.id) ? (
                        <ChevronRight data-icon="inline" />
                      ) : (
                        <ChevronDown data-icon="inline" />
                      )}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid min-h-[calc(360px*var(--app-scale))] place-items-center text-sm text-(--pro-org-muted)">
            {labels.empty}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-(--pro-org-border) px-3 py-2 text-xs text-(--pro-org-meta)">
        <span className="mr-auto">{labels.hint}</span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={labels.zoomOut}
          disabled={scale <= 0.5}
          onClick={() => setScale(Math.max(0.5, Math.round((scale - 0.1) * 10) / 10))}
        >
          <Minus data-icon="inline" />
        </Button>
        <span className="min-w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={labels.zoomIn}
          disabled={scale >= 1.5}
          onClick={() => setScale(Math.min(1.5, Math.round((scale + 0.1) * 10) / 10))}
        >
          <Plus data-icon="inline" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={labels.reset}
          onClick={() => {
            setScale(1);
            if (scroller.current) {
              revealNode(scroller.current, revealId ? buttons.current.get(revealId) : undefined);
            }
          }}
        >
          <RotateCcw data-icon="inline" />
        </Button>
      </div>
    </section>
  );
}
