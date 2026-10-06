import { useCallback, useEffect, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { Clock } from 'lucide-react';

import { TIME_RE } from '@/components/ui/calendar';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { TimeColumns } from './TimeColumns';

type TimeSegment = 'hour' | 'minute' | 'second';

type SegmentValues = Record<TimeSegment, number | null>;

const SEGMENT_MAX: Record<TimeSegment, number> = { hour: 23, minute: 59, second: 59 };

export interface TimeFieldLabels {
  /** 各段的可访问名（如「时」「分」「秒」）。不给就只靠容器的 aria-label */
  hour?: string;
  minute?: string;
  second?: string;
}

export interface TimeFieldProps {
  /** `HH:mm` 或 `HH:mm:ss`；null = 未填 */
  value: string | null;
  onChange: (next: string | null) => void;
  /** 显示第三段「秒」 */
  withSeconds?: boolean;
  /** ↑↓ 在「分」段上的步进（分钟），默认 1 */
  step?: number;
  disabled?: boolean;
  /** 尺寸档：form = 34 / toolbar = 32 / panel = 28（面板底栏，且不出尾图标） */
  size?: 'form' | 'toolbar' | 'panel';
  labels?: TimeFieldLabels;
  /** 聚焦时在下方弹出时 / 分 [/ 秒] 滚动列（TimeColumns），与键盘输入并存；panel 档不用（DatePicker 面板已并排放列） */
  withPicker?: boolean;
  className?: string;
  id?: string;
  'aria-label': string;
  'aria-invalid'?: boolean;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function parseSegments(value: string | null): SegmentValues {
  if (!value || !TIME_RE.test(value)) return { hour: null, minute: null, second: null };
  const [hourText, minuteText, secondText] = value.split(':');
  return {
    hour: Number(hourText),
    minute: Number(minuteText),
    second: secondText === undefined ? null : Number(secondText),
  };
}

function serialize(segments: SegmentValues, withSeconds: boolean): string | null {
  const { hour, minute, second } = segments;
  if (hour === null || minute === null) return null;
  if (withSeconds && second === null) return null;
  const head = `${pad2(hour)}:${pad2(minute)}`;
  return withSeconds ? `${head}:${pad2(second ?? 0)}` : head;
}

const segmentBoxClass = [
  'inline-flex size-[calc(22px*var(--app-scale))] cursor-text select-none items-center',
  'justify-center rounded-sm font-mono text-[calc(13px*var(--app-scale))] outline-none',
  'data-[filled=false]:text-(--field-placeholder)',
  'data-[active=true]:bg-(--pri-soft) data-[active=true]:font-medium',
  'data-[active=true]:text-(--button-text-fg)',
].join(' ');

export function TimeField({
  value,
  onChange,
  withSeconds = false,
  step = 1,
  disabled = false,
  size = 'form',
  labels,
  withPicker = false,
  className,
  id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: TimeFieldProps): JSX.Element {
  const order: TimeSegment[] = withSeconds ? ['hour', 'minute', 'second'] : ['hour', 'minute'];

  const [segments, setSegments] = useState<SegmentValues>(() => parseSegments(value));
  const [active, setActive] = useState<TimeSegment | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const emittedRef = useRef<string | null>(value);
  const bufferRef = useRef<{ segment: TimeSegment; digits: string } | null>(null);
  const nodeRefs = useRef<Partial<Record<TimeSegment, HTMLSpanElement | null>>>({});

  // 外部值与「本组件最后一次提交的值」不同才回灌，否则半截输入（只填了时）会被父级的 null 抹掉
  useEffect(() => {
    if (value === emittedRef.current) return;
    emittedRef.current = value;
    setSegments(parseSegments(value));
    bufferRef.current = null;
  }, [value]);

  const commit = useCallback(
    (next: SegmentValues) => {
      setSegments(next);
      const serialized = serialize(next, withSeconds);
      emittedRef.current = serialized;
      onChange(serialized);
    },
    [onChange, withSeconds],
  );

  const focusSegment = useCallback((segment: TimeSegment | undefined) => {
    if (!segment) return;
    nodeRefs.current[segment]?.focus();
  }, []);

  const handleKeyDown = (segment: TimeSegment) => (event: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return;
    const index = order.indexOf(segment);
    const max = SEGMENT_MAX[segment];
    const key = event.key;

    if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault();
      bufferRef.current = null;
      const delta = (key === 'ArrowUp' ? 1 : -1) * (segment === 'minute' ? Math.max(1, step) : 1);
      const span = max + 1;
      const current = segments[segment] ?? 0;
      const nextValue = (((current + delta) % span) + span) % span;
      commit({ ...segments, [segment]: nextValue });
      return;
    }

    if (key === 'ArrowLeft') {
      event.preventDefault();
      bufferRef.current = null;
      focusSegment(order[index - 1]);
      return;
    }

    if (key === 'ArrowRight' || key === ':' || key === ' ') {
      event.preventDefault();
      bufferRef.current = null;
      focusSegment(order[index + 1]);
      return;
    }

    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      const wasEmpty = segments[segment] === null;
      bufferRef.current = null;
      if (!wasEmpty) {
        commit({ ...segments, [segment]: null });
        return;
      }
      if (key === 'Backspace') focusSegment(order[index - 1]);
      return;
    }

    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      const buffered = bufferRef.current?.segment === segment ? bufferRef.current.digits : '';
      if (buffered === '') {
        const first = Number(key);
        commit({ ...segments, [segment]: first });
        if (first * 10 > max) {
          bufferRef.current = null;
          focusSegment(order[index + 1]);
        } else {
          bufferRef.current = { segment, digits: key };
        }
        return;
      }
      const combined = Number(`${buffered}${key}`);
      const resolved = combined > max ? Number(key) : combined;
      commit({ ...segments, [segment]: resolved });
      bufferRef.current = null;
      focusSegment(order[index + 1]);
    }
  };

  const heightClass =
    size === 'form'
      ? 'h-[var(--control-md)]'
      : size === 'toolbar'
        ? 'h-[var(--control-btn-md)]'
        : 'h-[var(--control-sm)]';
  const widthClass =
    size === 'panel'
      ? withSeconds
        ? 'w-[calc(126px*var(--app-scale))]'
        : 'w-[calc(104px*var(--app-scale))]'
      : withSeconds
        ? 'w-[calc(170px*var(--app-scale))]'
        : 'w-[calc(150px*var(--app-scale))]';
  const paddingClass =
    size === 'panel' ? 'px-[calc(6px*var(--app-scale))]' : 'px-[calc(10px*var(--app-scale))]';

  const anyFilled = order.some((segment) => segments[segment] !== null);

  const field = (
    <span
      data-slot="time-field"
      id={id}
      role="group"
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid || undefined}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        'ui-field inline-flex items-center gap-[calc(8px*var(--app-scale))] rounded-md border',
        'transition-[border-color,box-shadow,background,color]',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed',
        'data-[disabled=true]:text-(--text-faint)',
        heightClass,
        widthClass,
        paddingClass,
        className,
      )}
    >
      <span className="inline-flex items-center gap-[calc(1px*var(--app-scale))]">
        {order.map((segment, index) => {
          const current = segments[segment];
          const display = current === null ? '--' : pad2(current);
          return (
            <span key={segment} className="inline-flex items-center">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'text-[calc(13px*var(--app-scale))]',
                    anyFilled ? 'text-(--text-3)' : 'text-(--field-placeholder)',
                  )}
                >
                  :
                </span>
              )}
              <span
                ref={(node) => {
                  nodeRefs.current[segment] = node;
                }}
                data-slot="time-field-segment"
                data-segment={segment}
                data-active={active === segment || undefined}
                data-filled={current !== null}
                role="spinbutton"
                tabIndex={disabled ? -1 : 0}
                aria-label={labels?.[segment]}
                aria-valuemin={0}
                aria-valuemax={SEGMENT_MAX[segment]}
                aria-valuenow={current ?? undefined}
                aria-valuetext={display}
                className={segmentBoxClass}
                onFocus={() => {
                  setActive(segment);
                  if (withPicker && !disabled) setPickerOpen(true);
                }}
                onBlur={() => {
                  setActive((previous) => (previous === segment ? null : previous));
                  bufferRef.current = null;
                }}
                onKeyDown={handleKeyDown(segment)}
              >
                {display}
              </span>
            </span>
          );
        })}
      </span>
      {size !== 'panel' && (
        <>
          <span aria-hidden="true" className="flex-1" />
          {/* 不挂 data-icon：global.css 的 `.ui-field [data-icon]` 会把尺寸钉成 15px，板 4.3 是 13px */}
          <Clock
            aria-hidden="true"
            className="size-[calc(13px*var(--app-scale))] shrink-0 text-(--field-icon)"
          />
        </>
      )}
    </span>
  );

  if (!withPicker) return field;

  return (
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      <PopoverAnchor asChild>{field}</PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        data-slot="time-field-picker"
        className="w-auto p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          // 点回输入框本体不算「外部」，否则一点段就关
          const target = event.target as Node | null;
          if (target && nodeRefs.current.hour?.closest('[data-slot="time-field"]')?.contains(target)) {
            event.preventDefault();
          }
        }}
      >
        <TimeColumns
          value={serialize(segments, withSeconds)}
          withSeconds={withSeconds}
          step={step}
          labels={labels}
          aria-label={ariaLabel}
          onChange={(next) => {
            commit(parseSegments(next));
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
