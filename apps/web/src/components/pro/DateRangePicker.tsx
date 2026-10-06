import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Calendar,
  countIsoDays,
  formatIsoDate,
  parseDateValue,
  type CalendarLabelProps,
} from '@/components/ui/calendar';
import { InputGroup, InputGroupInput, InputGroupSuffix } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { quickRangeDates, type QuickRangeKey } from './filter-menu/date-range';

export type { QuickRangeKey } from './filter-menu/date-range';

/** 起止对；两侧都可能是空串（半截草稿） */
export type DateRangeValue = [string, string];

export interface DateRangePickerLabels {
  /** 起始段占位与可访问名 */
  start: string;
  /** 结束段占位与可访问名 */
  end: string;
  clear: string;
  /** 给了才出「确定」钮，语义随之变成「确定才提交」；不给就选满即提交 */
  confirm?: string;
  /** 底栏天数回显，如 (n) => `· ${n} 天`；不给就不显示 */
  days?: (count: number) => string;
  /** 左侧快捷列文案；只渲染在这里有文案的 key（pro 层不自带任何文案） */
  presets?: Partial<Record<QuickRangeKey, string>>;
}

const DEFAULT_PRESETS: readonly QuickRangeKey[] = [
  'today',
  'last7',
  'last30',
  'thisMonth',
  'lastMonth',
  'thisQuarter',
];

const railItemClass = [
  'flex h-[calc(28px*var(--app-scale))] cursor-pointer items-center rounded-md',
  'px-[calc(10px*var(--app-scale))] text-left text-[calc(12.5px*var(--app-scale))]',
  'text-(--type-2-fg) outline-none transition-[background,color]',
  'hover:bg-(--option-bg-highlighted)',
  'data-[selected=true]:bg-(--option-bg-highlighted) data-[selected=true]:font-medium',
  'data-[selected=true]:text-(--button-text-fg)',
].join(' ');

function tupleKey(value: DateRangeValue | null): string {
  return value ? `${value[0]}|${value[1]}` : '';
}

export interface DateRangePickerPanelProps extends CalendarLabelProps {
  /** 面板当前（草稿）区间，任一侧可为空串 */
  value: DateRangeValue | null;
  /** 草稿变更（点日 / 快捷项） */
  onChange: (next: DateRangeValue | null) => void;
  /** 提交并请求关闭（清除 / 确定） */
  onCommit: (next: DateRangeValue | null) => void;
  presets?: readonly QuickRangeKey[];
  labels: DateRangePickerLabels;
  className?: string;
}

export function DateRangePickerPanel({
  value,
  onChange,
  onCommit,
  presets = DEFAULT_PRESETS,
  labels,
  className,
  ...calendarLabels
}: DateRangePickerPanelProps): JSX.Element {
  const from = value?.[0] ?? '';
  const to = value?.[1] ?? '';
  const fromDate = parseDateValue(from);
  const toDate = parseDateValue(to);

  const monthAnchor = fromDate ? new Date(fromDate.getFullYear(), fromDate.getMonth(), 1) : null;
  const anchorKey = monthAnchor ? formatIsoDate(monthAnchor) : '';
  const [navMonth, setNavMonth] = useState<Date | null>(null);
  const anchorKeyRef = useRef(anchorKey);
  useEffect(() => {
    if (anchorKey === anchorKeyRef.current) return;
    anchorKeyRef.current = anchorKey;
    setNavMonth(null);
  }, [anchorKey]);

  const railItems = presets
    .map((key) => ({ key, label: labels.presets?.[key] }))
    .filter((item): item is { key: QuickRangeKey; label: string } => Boolean(item.label));

  const dayCount = from !== '' && to !== '' ? countIsoDays(from, to) : 0;

  return (
    <div
      data-slot="date-range-picker-panel"
      className={cn('flex w-full flex-col overflow-hidden', className)}
    >
      <div className="flex">
        {railItems.length > 0 && (
          <div
            data-slot="date-range-picker-presets"
            className="flex w-[calc(96px*var(--app-scale))] shrink-0 flex-col gap-[calc(2px*var(--app-scale))] border-r border-(--picker-footer-border) bg-(--picker-footer-bg) px-[calc(6px*var(--app-scale))] py-[calc(8px*var(--app-scale))]"
          >
            {railItems.map((item) => {
              const [presetFrom, presetTo] = quickRangeDates(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  data-slot="date-range-picker-preset"
                  data-selected={(presetFrom === from && presetTo === to) || undefined}
                  className={railItemClass}
                  onClick={() => onChange([presetFrom, presetTo])}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="px-[calc(14px*var(--app-scale))] pt-[calc(10px*var(--app-scale))] pb-[calc(8px*var(--app-scale))]">
          <Calendar
            {...calendarLabels}
            mode="range"
            numberOfMonths={2}
            selected={fromDate ? { from: fromDate, to: toDate ?? undefined } : undefined}
            month={navMonth ?? monthAnchor ?? undefined}
            onMonthChange={setNavMonth}
            onSelect={(range) => {
              if (!range?.from) {
                onChange(null);
                return;
              }
              onChange([formatIsoDate(range.from), range.to ? formatIsoDate(range.to) : '']);
            }}
          />
        </div>
      </div>

      <div
        data-slot="date-range-picker-footer"
        className="flex h-[calc(40px*var(--app-scale))] items-center gap-[calc(10px*var(--app-scale))] border-t border-(--picker-footer-border) bg-(--picker-footer-bg) px-[calc(14px*var(--app-scale))]"
      >
        {from !== '' && to !== '' && (
          <>
            <span
              data-slot="date-range-picker-echo"
              className="font-mono text-[calc(12px*var(--app-scale))] text-(--type-2-fg)"
            >
              {from} ~ {to}
            </span>
            {labels.days && (
              <span className="text-[calc(11.5px*var(--app-scale))] text-(--picker-footer-fg)">
                {labels.days(dayCount)}
              </span>
            )}
          </>
        )}
        <span aria-hidden="true" className="flex-1" />
        <button
          type="button"
          data-slot="date-range-picker-clear"
          className="inline-flex h-[calc(28px*var(--app-scale))] cursor-pointer items-center rounded-md px-[calc(8px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))] text-(--button-text-fg) outline-none transition-[background,color] hover:bg-(--button-text-bg-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)"
          onClick={() => onCommit(null)}
        >
          {labels.clear}
        </button>
        {labels.confirm && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            data-slot="date-range-picker-confirm"
            className="rounded-md px-[calc(12px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))]"
            onClick={() => onCommit(from !== '' && to !== '' ? [from, to] : null)}
          >
            {labels.confirm}
          </Button>
        )}
      </div>
    </div>
  );
}

export interface DateRangePickerProps extends CalendarLabelProps {
  /** `[起, 止]`，两侧都是 `YYYY-MM-DD`；null = 未填。任一侧空串表示半截草稿 */
  value: DateRangeValue | null;
  onChange: (next: DateRangeValue | null) => void;
  presets?: readonly QuickRangeKey[];
  labels: DateRangePickerLabels;
  disabled?: boolean;
  size?: 'form' | 'toolbar';
  /** 给外部 FieldLabel 的 htmlFor 用（落在起始段输入上） */
  id?: string;
  className?: string;
  'aria-label': string;
  'aria-invalid'?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  presets,
  labels,
  disabled = false,
  size = 'form',
  id,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  ...calendarLabels
}: DateRangePickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<'from' | 'to' | null>(null);
  const [range, setRange] = useState<DateRangeValue>([value?.[0] ?? '', value?.[1] ?? '']);
  const anchorRef = useRef<HTMLDivElement>(null);
  const justClosedRef = useRef(false);
  const emittedKeyRef = useRef(tupleKey(value));

  useEffect(() => {
    const key = tupleKey(value);
    if (key === emittedKeyRef.current) return;
    emittedKeyRef.current = key;
    setRange([value?.[0] ?? '', value?.[1] ?? '']);
  }, [value]);

  const [from, to] = range;
  const fromInvalid = from !== '' && parseDateValue(from) === null;
  const toInvalid = to !== '' && parseDateValue(to) === null;
  const orderInvalid = from !== '' && to !== '' && !fromInvalid && !toInvalid && from > to;
  const invalid = ariaInvalid === true || fromInvalid || toInvalid || orderInvalid;

  const emit = useCallback(
    (next: DateRangeValue | null) => {
      const key = tupleKey(next);
      // 值没变就不再喊一遍：点日格会先让输入框失焦，失焦提交与点选提交会撞成两次同值回调
      if (key === emittedKeyRef.current) return;
      emittedKeyRef.current = key;
      onChange(next);
    },
    [onChange],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (next) return;
    setActive(null);
    justClosedRef.current = true;
    window.setTimeout(() => {
      justClosedRef.current = false;
    }, 0);
  }, []);

  /** 起止都合法且顺序正确才向外提交；半截草稿只留在本组件内 */
  const publish = useCallback(
    (next: DateRangeValue) => {
      setRange(next);
      const [nextFrom, nextTo] = next;
      if (nextFrom === '' && nextTo === '') {
        emit(null);
        return false;
      }
      if (!parseDateValue(nextFrom) || !parseDateValue(nextTo) || nextFrom > nextTo) return false;
      emit(next);
      return true;
    },
    [emit],
  );

  const commitAndClose = useCallback(
    (next: DateRangeValue | null) => {
      setRange([next?.[0] ?? '', next?.[1] ?? '']);
      emit(next);
      handleOpenChange(false);
    },
    [emit, handleOpenChange],
  );

  const segmentClass = 'w-full font-mono text-[calc(13px*var(--app-scale))]';
  const barClass = [
    'pointer-events-none absolute inset-x-0 bottom-[calc(6px*var(--app-scale))]',
    'h-[calc(2px*var(--app-scale))] rounded-full bg-(--pri)',
  ].join(' ');

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className={cn('w-full min-w-0', className)}>
          <InputGroup
            inputSize={size === 'form' ? 'md' : 'sm'}
            data-slot="date-range-picker-trigger"
            data-state={open ? 'open' : undefined}
            data-disabled={disabled || undefined}
            aria-invalid={invalid || undefined}
            className={cn(
              'gap-[calc(8px*var(--app-scale))]',
              size === 'toolbar' && 'h-[var(--control-btn-md)]',
              disabled && 'text-(--text-faint)',
            )}
          >
            <span className="relative inline-flex h-full min-w-0 flex-1 items-center">
              <InputGroupInput
                id={id}
                value={from}
                disabled={disabled}
                aria-label={labels.start}
                aria-invalid={fromInvalid || orderInvalid || undefined}
                placeholder={labels.start}
                inputMode="numeric"
                autoComplete="off"
                className={segmentClass}
                onFocus={() => {
                  setActive('from');
                  if (!disabled && !justClosedRef.current) setOpen(true);
                }}
                onMouseDown={() => {
                  if (!disabled) setOpen(true);
                }}
                onChange={(event) => setRange([event.target.value, to])}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  publish([from, to]);
                }}
                onBlur={() => publish([from, to])}
              />
              {active === 'from' && open && <span aria-hidden="true" className={barClass} />}
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 px-[calc(2px*var(--app-scale))] text-[calc(12px*var(--app-scale))] text-(--text-4)"
            >
              ~
            </span>
            <span className="relative inline-flex h-full min-w-0 flex-1 items-center">
              <InputGroupInput
                value={to}
                disabled={disabled}
                aria-label={labels.end}
                aria-invalid={toInvalid || orderInvalid || undefined}
                placeholder={labels.end}
                inputMode="numeric"
                autoComplete="off"
                className={segmentClass}
                onFocus={() => {
                  setActive('to');
                  if (!disabled && !justClosedRef.current) setOpen(true);
                }}
                onMouseDown={() => {
                  if (!disabled) setOpen(true);
                }}
                onChange={(event) => setRange([from, event.target.value])}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  publish([from, to]);
                }}
                onBlur={() => publish([from, to])}
              />
              {active === 'to' && open && <span aria-hidden="true" className={barClass} />}
            </span>
            <InputGroupSuffix>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                data-slot="date-range-picker-trigger-icon"
                disabled={disabled}
                className="inline-flex cursor-pointer items-center disabled:cursor-not-allowed"
                onClick={() => {
                  if (!disabled) setOpen(!open);
                }}
              >
                {/* 不挂 data-icon：global.css 的 `.ui-field [data-icon]` 会把尺寸钉成 15px，板 4.2 是 13px */}
                <CalendarDays
                  aria-hidden="true"
                  className="size-[calc(13px*var(--app-scale))] shrink-0 text-(--field-icon)"
                />
              </button>
            </InputGroupSuffix>
          </InputGroup>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={4}
        data-slot="date-range-picker-popover"
        aria-label={ariaLabel}
        className="w-[calc(648px*var(--app-scale))] max-h-[var(--radix-popper-available-height)] overflow-y-auto p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
      >
        <DateRangePickerPanel
          {...calendarLabels}
          value={range}
          presets={presets}
          labels={labels}
          onChange={(next) => {
            const tuple: DateRangeValue = [next?.[0] ?? '', next?.[1] ?? ''];
            const complete = publish(tuple);
            // 没给「确定」文案就是「选满即提交并收起」（筛选面板复用本件走这条）
            if (complete && !labels.confirm) handleOpenChange(false);
          }}
          onCommit={commitAndClose}
        />
      </PopoverContent>
    </Popover>
  );
}
