import { useEffect, useRef, useState, type JSX, type KeyboardEvent, type PointerEvent } from 'react';
import { Columns3, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TableDensity } from './table-density';

export interface ColumnSettingsItem {
  id: string;
  label: string;
  visible: boolean;
}

export interface ColumnSettingsLabels {
  trigger: string;
  densityTitle: string;
  densities: Record<TableDensity, string>;
  columnsTitle: string;
  summary: (shown: number, total: number) => string;
  dragHint: string;
  reset: string;
  persistHint: string;
}

export interface ColumnSettingsProps {
  density: TableDensity;
  onDensityChange: (density: TableDensity) => void;
  columns: ColumnSettingsItem[];
  onColumnsChange: (next: ColumnSettingsItem[]) => void;
  onReset: () => void;
  labels: ColumnSettingsLabels;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DENSITY_ORDER: TableDensity[] = ['default', 'relaxed', 'loose'];
const SETTLE_MS = 160;

/** 一次拖动：被拖行跟手位移，其余行按目标位置让出一格；松手先落位再提交顺序。 */
interface DragState {
  id: string;
  from: number;
  target: number;
  startY: number;
  dy: number;
  rowHeight: number;
  settling: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

function shiftOf(index: number, drag: DragState): number {
  if (index === drag.from) return drag.dy;
  if (drag.from < drag.target && index > drag.from && index <= drag.target) return -drag.rowHeight;
  if (drag.from > drag.target && index >= drag.target && index < drag.from) return drag.rowHeight;
  return 0;
}

export function ColumnSettings({
  density,
  onDensityChange,
  columns,
  onColumnsChange,
  onReset,
  labels,
  open: openProp,
  onOpenChange,
}: ColumnSettingsProps): JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  const open = openProp ?? uncontrolledOpen;
  const shown = columns.filter((column) => column.visible).length;

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const moveColumn = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || to >= columns.length) return;
    const next = [...columns];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onColumnsChange(next);
  };

  const onHandlePointerDown = (event: PointerEvent<HTMLButtonElement>, id: string, index: number) => {
    if (event.button !== 0 || drag) return;
    const row = event.currentTarget.closest('li');
    if (!row) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      id,
      from: index,
      target: index,
      startY: event.clientY,
      dy: 0,
      rowHeight: row.getBoundingClientRect().height,
      settling: false,
    });
  };

  const onHandlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.settling || drag.rowHeight <= 0) return;
    const last = columns.length - 1;
    const dy = Math.min(
      Math.max(event.clientY - drag.startY, -drag.from * drag.rowHeight),
      (last - drag.from) * drag.rowHeight,
    );
    const target = Math.min(Math.max(Math.round(drag.from + dy / drag.rowHeight), 0), last);
    setDrag({ ...drag, dy, target });
  };

  const finishDrag = (commit: boolean) => {
    if (!drag || drag.settling) return;
    if (!commit) {
      setDrag(null);
      return;
    }
    const { from, target, rowHeight } = drag;
    const done = () => {
      moveColumn(from, target);
      setDrag(null);
    };
    if (prefersReducedMotion() || rowHeight <= 0) {
      done();
      return;
    }
    setDrag({ ...drag, dy: (target - from) * rowHeight, settling: true });
    settleTimer.current = window.setTimeout(done, SETTLE_MS);
  };

  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    moveColumn(index, index + (event.key === 'ArrowUp' ? -1 : 1));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (openProp === undefined) setUncontrolledOpen(next);
        onOpenChange?.(next);
      }}
    >
      {/* 板 DSAdditions 4.9：工具栏右组四个 32px 图标钮（刷新 · 密度/列设置 · 全屏）同貌，文案进 tooltip 与 aria-label */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-slot="column-settings-trigger"
                aria-label={labels.trigger}
              >
                <Columns3 data-icon="only" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {labels.trigger}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        align="start"
        sideOffset={6}
        data-slot="column-settings"
        className="w-[calc(280px*var(--app-scale))] p-0"
      >
        <section className="px-[calc(12px*var(--app-scale))] pt-[calc(12px*var(--app-scale))] pb-[calc(8px*var(--app-scale))]">
          <p className="mb-[calc(8px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--text-3)">
            {labels.densityTitle}
          </p>
          <div
            role="radiogroup"
            aria-label={labels.densityTitle}
            className="grid grid-cols-3 gap-[calc(4px*var(--app-scale))] rounded-md bg-(--surface-2) p-[calc(3px*var(--app-scale))]"
          >
            {DENSITY_ORDER.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={density === item}
                data-density={item}
                className={cn(
                  'h-[calc(26px*var(--app-scale))] cursor-pointer rounded-sm text-[calc(12.5px*var(--app-scale))]',
                  density === item ? 'bg-(--overlay-bg) font-medium text-(--text)' : 'text-(--type-2-fg)',
                )}
                onClick={() => onDensityChange(item)}
              >
                {labels.densities[item]}
              </button>
            ))}
          </div>
        </section>

        <section className="border-t border-(--overlay-border) px-[calc(12px*var(--app-scale))] py-[calc(8px*var(--app-scale))]">
          <div className="mb-[calc(6px*var(--app-scale))] flex items-center justify-between text-[calc(11.5px*var(--app-scale))] text-(--text-3)">
            <span>{labels.columnsTitle}</span>
            <span>
              {labels.summary(shown, columns.length)} · {labels.dragHint}
            </span>
          </div>
          <ul data-slot="column-settings-list">
            {columns.map((column, index) => {
              const dragged = drag?.id === column.id;
              const shift = drag ? shiftOf(index, drag) : 0;
              return (
                <li
                  key={column.id}
                  data-slot="column-settings-item"
                  data-dragging={dragged || undefined}
                  style={
                    drag
                      ? {
                          transform: shift ? `translateY(${shift}px)` : undefined,
                          transition:
                            dragged && !drag.settling ? 'none' : `transform ${SETTLE_MS}ms ease-out`,
                        }
                      : undefined
                  }
                  className={cn(
                    'relative flex h-[calc(30px*var(--app-scale))] items-center gap-[calc(8px*var(--app-scale))]',
                    dragged &&
                      'z-10 cursor-grabbing rounded-md bg-(--overlay-bg) shadow-(--overlay-shadow-popover)',
                  )}
                >
                  <Checkbox
                    checked={column.visible}
                    aria-label={column.label}
                    onCheckedChange={(checked) =>
                      onColumnsChange(
                        columns.map((item) => (item.id === column.id ? { ...item, visible: checked } : item)),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate text-[calc(13px*var(--app-scale))]">
                    {column.label}
                  </span>
                  <button
                    type="button"
                    aria-label={labels.dragHint}
                    aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                    className={cn(
                      'touch-none cursor-grab text-(--text-3) outline-none focus-visible:text-(--text)',
                      dragged && 'cursor-grabbing text-(--text)',
                    )}
                    onPointerDown={(event) => onHandlePointerDown(event, column.id, index)}
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={() => finishDrag(true)}
                    onPointerCancel={() => finishDrag(false)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape' && drag) {
                        event.stopPropagation();
                        finishDrag(false);
                        return;
                      }
                      onHandleKeyDown(event, index);
                    }}
                  >
                    <GripVertical className="size-[calc(14px*var(--app-scale))]" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <footer className="border-t border-(--overlay-border) px-[calc(12px*var(--app-scale))] py-[calc(10px*var(--app-scale))]">
          <button
            type="button"
            data-slot="column-settings-reset"
            className="cursor-pointer text-[calc(12.5px*var(--app-scale))] text-(--type-2-fg)"
            onClick={onReset}
          >
            {labels.reset}
          </button>
          <p className="mt-[calc(4px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--text-3)">
            {labels.persistHint}
          </p>
        </footer>
      </PopoverContent>
    </Popover>
  );
}
