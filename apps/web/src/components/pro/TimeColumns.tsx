/**
 * TimeColumns —— 时 / 分 [/ 秒] 滚动选列（antd TimePicker 的三列滚轮形态）。
 *
 * 抄袭源：antd TimePicker 列面板（MIT，只取形态：每列一根可滚的选项列、当前项高亮、点选即写入）
 *        + 本仓 --option-* token 改造。
 *
 * 与 TimeField 的分工（「鼠标能滚、键盘能打」两者并存）：
 *   TimeField 负责键盘三段式输入，TimeColumns 负责鼠标滚选；两者读写同一个 `HH:mm[:ss]` 串。
 *   DatePicker showTime 面板把本件并排放在日历右侧；独立 TimeField 传 `withPicker` 时把本件挂在 Popover 里。
 *
 * 几何（沿用 PickerPanel 选项行与 4.1 面板字号）：列宽 56、选项行高 28、字号 12.5 mono，
 * 可见 7 行（196 高，DatePicker 内由父级拉伸到日历同高）；选中项 --option-bg-selected + --option-fg-selected，
 * hover --option-bg-highlighted；列间 1px --picker-footer-border 竖线。
 * 值变化时把选中项滚到列中央（`scrollIntoView` 在 jsdom 下不存在，做了存在性判断）。
 */
import { useEffect, useRef, type JSX } from 'react';

import { TIME_RE } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type TimeSegment = 'hour' | 'minute' | 'second';

export interface TimeColumnsLabels {
  hour?: string;
  minute?: string;
  second?: string;
}

export interface TimeColumnsProps {
  /** `HH:mm` 或 `HH:mm:ss`；null = 未填（列里无高亮） */
  value: string | null;
  /** 点选任一列后回吐完整串；未填的段按 0 补齐，保证一次点选就得到合法时间 */
  onChange: (next: string) => void;
  withSeconds?: boolean;
  /** 「分」列的步长（分钟），默认 1 */
  step?: number;
  disabled?: boolean;
  labels?: TimeColumnsLabels;
  className?: string;
  'aria-label': string;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function parse(value: string | null): Record<TimeSegment, number | null> {
  if (!value || !TIME_RE.test(value)) return { hour: null, minute: null, second: null };
  const [h, m, s] = value.split(':');
  return { hour: Number(h), minute: Number(m), second: s === undefined ? null : Number(s) };
}

function range(max: number, step: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= max; i += step) out.push(i);
  return out;
}

const optionClass = [
  'flex h-[calc(28px*var(--app-scale))] w-full shrink-0 cursor-pointer items-center justify-center',
  'font-mono text-[calc(12.5px*var(--app-scale))] text-(--option-fg) outline-none',
  'transition-[background,color] hover:bg-(--option-bg-highlighted)',
  'data-[selected=true]:bg-(--option-bg-selected) data-[selected=true]:font-medium',
  'data-[selected=true]:text-(--option-fg-selected)',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

function Column({
  segment,
  options,
  selected,
  disabled,
  label,
  onPick,
}: {
  segment: TimeSegment;
  options: number[];
  selected: number | null;
  disabled: boolean;
  label?: string;
  onPick: (next: number) => void;
}): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);

  // 只滚本列：scrollIntoView 会连带滚动外层弹层/页面，把整块面板顶歪
  useEffect(() => {
    const list = listRef.current;
    if (!list || selected === null) return;
    const node = list.querySelector<HTMLElement>(`[data-value="${selected}"]`);
    if (!node) return;
    list.scrollTop = node.offsetTop - (list.clientHeight - node.offsetHeight) / 2;
  }, [selected]);

  return (
    <div
      ref={listRef}
      data-slot="time-columns-column"
      data-segment={segment}
      role="listbox"
      aria-label={label}
      // 弹层在对话框里时外层滚动锁会吞掉滚轮；列自己消化滚轮事件，才能在对话框内滚动
      onWheel={(event) => event.stopPropagation()}
      className={cn(
        'relative flex min-h-0 w-[calc(56px*var(--app-scale))] flex-col overflow-y-auto overscroll-contain',
        'pt-[calc(4px*var(--app-scale))] pb-[calc(160px*var(--app-scale))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'border-l border-(--picker-footer-border) first:border-l-0',
      )}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="option"
          data-slot="time-columns-option"
          data-value={option}
          data-selected={option === selected || undefined}
          aria-selected={option === selected}
          disabled={disabled}
          tabIndex={-1}
          className={optionClass}
          onClick={() => onPick(option)}
        >
          {pad2(option)}
        </button>
      ))}
    </div>
  );
}

export function TimeColumns({
  value,
  onChange,
  withSeconds = false,
  step = 1,
  disabled = false,
  labels,
  className,
  'aria-label': ariaLabel,
}: TimeColumnsProps): JSX.Element {
  const segments = parse(value);
  const order: TimeSegment[] = withSeconds ? ['hour', 'minute', 'second'] : ['hour', 'minute'];
  const minuteStep = Math.max(1, Math.min(59, Math.floor(step)));

  const pick = (segment: TimeSegment, next: number) => {
    const merged = { ...segments, [segment]: next };
    const hour = merged.hour ?? 0;
    const minute = merged.minute ?? 0;
    const second = merged.second ?? 0;
    const head = `${pad2(hour)}:${pad2(minute)}`;
    onChange(withSeconds ? `${head}:${pad2(second)}` : head);
  };

  return (
    <div
      data-slot="time-columns"
      role="group"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={cn('flex h-[calc(196px*var(--app-scale))] min-h-0 overflow-hidden', className)}
    >
      {order.map((segment) => (
        <Column
          key={segment}
          segment={segment}
          options={segment === 'minute' ? range(59, minuteStep) : range(segment === 'hour' ? 23 : 59, 1)}
          selected={segments[segment]}
          disabled={disabled}
          label={labels?.[segment]}
          onPick={(next) => pick(segment, next)}
        />
      ))}
    </div>
  );
}
