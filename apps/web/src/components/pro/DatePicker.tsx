/**
 * DatePicker —— 可手输触发器 + 单日期 / 日期时间面板（对标 antd DatePicker）。
 *
 * 抄袭源：shadcn/ui date-picker（MIT，Popover + Calendar 的组合法）
 *        + antd DatePicker 的「showTime 两步提交」语义 + 本仓 ui-field / --overlay-* / --picker-* token 改造。
 *
 * 视觉真相源：design-explore/pipeline-board/DSAdditions.dc.html 4.1。
 * 逐值出处（板 → 本文件）：
 *   · 触发器   `width:190/280; height:32px; padding:0 10px; gap:8px; radius:4;
 *               background:#fdfdfc; border:1px solid #ececea` → InputGroup + ui-field 状态机
 *               值 mono 13px `#1c1c1a`、占位 `#b0b0ad`、尾 calendar 图标 13px `stroke:#9a9a97`(--field-icon)
 *               聚焦 `border:#f97316 + 0 0 0 3px rgba(249,115,22,.14)`、错误 `#e5484d + rgba(229,72,77,.10)`、
 *               禁用 `background:#fafaf9; border:#f0f0ee; color:#c4c4c1` —— 五态全部由 ui-field 承担
 *   · 面板     `width:280px; radius:8`(--overlay-radius)`; border:#ececea; box-shadow 12/32` → PopoverContent
 *               触发器下方 4px（sideOffset=4）
 *   · 快捷 chips `padding:10px 12px 6px; gap:6px; border-bottom:1px solid #f5f5f3`；
 *               chip `height:24px; padding:0 9px; radius:4; font-size:12px`，
 *               未选 `color:#4f4f4d`(--text-2)，选中 `background:#f5f5f4`(--option-bg-highlighted)`+ color:#e0680c`(--button-text-fg)`+500`
 *   · 日历区   带 chips `padding:6px 14px 8px`；showTime（无 chips）`padding:10px 14px 8px`
 *   · 底栏     `height:34px; padding:0 14px; background:#fafaf9`(--picker-footer-bg)
 *               `border-top:1px solid #f0f0ee`(--picker-footer-border)`; font-size:11.5px; color:#b0b0ad`(--picker-footer-fg)
 *               「今天」`color:#e0680c`(--button-text-fg)
 *   · 时间栏   `height:44px; padding:0 14px; gap:10px`；「时间」12px `#8f8f8c`(--text-3)；
 *               TimeField size="panel"；「此刻」12px `#e0680c`；「确定」`height:28px; padding:0 12px; radius:4; 12.5px`
 *
 * 提交语义（板 4.1 说明，与 antd 一致）：不带时间点日即提交并关闭；showTime 点日只改日期不关闭，「确定」才提交。
 * 手输合法值回车 / 失焦提交；非法值保留输入并标 aria-invalid，不吞掉。
 */
import { useCallback, useEffect, useRef, useState, type JSX, type Ref, type FocusEventHandler } from 'react';
import { CalendarDays, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Calendar,
  TIME_RE,
  formatDateValue,
  formatIsoDate,
  formatIsoTime,
  parseDateValue,
  type CalendarLabelProps,
} from '@/components/ui/calendar';
import { InputGroup, InputGroupInput, InputGroupSuffix } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { TimeField, type TimeFieldLabels } from './TimeField';
import { TimeColumns } from './TimeColumns';

export interface DatePickerLabels {
  /** 底栏「今天」/ 快捷区常用项 */
  today: string;
  /** 底栏「清除」 */
  clear: string;
  /** showTime 时间栏「确定」 */
  confirm: string;
  /** showTime 时间栏「此刻」 */
  now: string;
  /** showTime 时间栏前缀「时间」 */
  time: string;
}

export interface DatePickerPreset {
  label: string;
  /** 与 value 同形状的完整值（`YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`） */
  value: string;
}

/** 值拆成「日期部分 + 时间部分」，两边都可能缺；`YYYY-MM-DD HH:mm` 与纯 `YYYY-MM-DD` 都吃 */
function readValue(value: string | null): { date: Date | null; time: string | null } {
  if (!value) return { date: null, time: null };
  const [datePart, timePart] = value.trim().split(' ');
  return {
    date: parseDateValue(datePart ?? '', false),
    time: timePart && TIME_RE.test(timePart) ? timePart : null,
  };
}

function writeValue(
  date: Date | null,
  time: string | null,
  showTime: boolean,
  withSeconds = false,
): string | null {
  if (!date) return null;
  if (!showTime) return formatIsoDate(date);
  return `${formatIsoDate(date)} ${time ?? (withSeconds ? '00:00:00' : '00:00')}`;
}

const chipClass = [
  'inline-flex h-[calc(24px*var(--app-scale))] cursor-pointer items-center rounded-md',
  'px-[calc(9px*var(--app-scale))] text-[calc(12px*var(--app-scale))] text-(--type-2-fg)',
  'transition-[background,color] hover:bg-(--option-bg-highlighted)',
  'data-[selected=true]:bg-(--option-bg-highlighted) data-[selected=true]:font-medium',
  'data-[selected=true]:text-(--button-text-fg)',
].join(' ');

const footerTextButtonClass = [
  'inline-flex cursor-pointer items-center rounded-md px-[calc(4px*var(--app-scale))]',
  'text-[calc(11.5px*var(--app-scale))] outline-none transition-[background,color]',
  'hover:bg-(--button-text-bg-hover)',
  'focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)',
].join(' ');

export interface DatePickerPanelProps extends CalendarLabelProps {
  /** 面板当前（草稿）值 */
  value: string | null;
  /** 草稿变更：showTime 下点日 / 改时间 / 此刻 */
  onChange: (next: string | null) => void;
  /** 提交并请求关闭：不带时间点日、快捷项、今天、清除、确定 */
  onCommit: (next: string | null) => void;
  showTime?: boolean;
  withSeconds?: boolean;
  /** ↑↓ 在「分」段上的步进（分钟） */
  step?: number;
  presets?: readonly DatePickerPreset[];
  /** 可选下界 `YYYY-MM-DD` */
  min?: string;
  /** 可选上界 `YYYY-MM-DD` */
  max?: string;
  labels: DatePickerLabels;
  timeLabels?: TimeFieldLabels;
  className?: string;
}

export function DatePickerPanel({
  value,
  onChange,
  onCommit,
  showTime = false,
  withSeconds = false,
  step,
  presets,
  min,
  max,
  labels,
  timeLabels,
  className,
  ...calendarLabels
}: DatePickerPanelProps): JSX.Element {
  const { date, time } = readValue(value);
  const minDate = min ? parseDateValue(min) : null;
  const maxDate = max ? parseDateValue(max) : null;
  const disabledMatchers = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  // 翻月是面板自己的浏览状态；一旦选中值换了月份（手输 / 快捷项），浏览状态让位给值所在的月
  const monthAnchor = date ? new Date(date.getFullYear(), date.getMonth(), 1) : null;
  const anchorKey = monthAnchor ? formatIsoDate(monthAnchor) : '';
  const [navMonth, setNavMonth] = useState<Date | null>(null);
  const anchorKeyRef = useRef(anchorKey);
  useEffect(() => {
    if (anchorKey === anchorKeyRef.current) return;
    anchorKeyRef.current = anchorKey;
    setNavMonth(null);
  }, [anchorKey]);

  const handleSelect = (day: Date | undefined) => {
    if (!day) return;
    if (!showTime) {
      onCommit(formatIsoDate(day));
      return;
    }
    onChange(writeValue(day, time, true, withSeconds));
  };

  const handleNow = () => {
    const now = new Date();
    onChange(writeValue(date ?? now, formatIsoTime(now, withSeconds), true, withSeconds));
  };

  return (
    <div data-slot="date-picker-panel" className={cn('flex w-full flex-col overflow-hidden', className)}>
      {presets && presets.length > 0 && (
        <div
          data-slot="date-picker-presets"
          className="flex flex-wrap items-center gap-[calc(6px*var(--app-scale))] border-b border-(--picker-footer-border) px-[calc(12px*var(--app-scale))] pt-[calc(10px*var(--app-scale))] pb-[calc(6px*var(--app-scale))]"
        >
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              data-slot="date-picker-preset"
              data-selected={preset.value === value || undefined}
              className={chipClass}
              onClick={() => onCommit(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* showTime：日历右侧并排时 / 分 [/ 秒] 滚动列（鼠标滚选与键盘输入并存），列高跟随日历 */}
      <div className="flex min-h-0 items-stretch">
        <div
          className={cn(
            'px-[calc(14px*var(--app-scale))] pb-[calc(8px*var(--app-scale))]',
            presets && presets.length > 0
              ? 'pt-[calc(6px*var(--app-scale))]'
              : 'pt-[calc(10px*var(--app-scale))]',
          )}
        >
          <Calendar
            {...calendarLabels}
            mode="single"
            selected={date ?? undefined}
            month={navMonth ?? monthAnchor ?? undefined}
            onMonthChange={setNavMonth}
            disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
            startMonth={minDate ?? undefined}
            endMonth={maxDate ?? undefined}
            onSelect={handleSelect}
          />
        </div>
        {showTime && (
          // 外层只占宽、随日历拉伸；列本体绝对定位吃满，才能拿到确定高度去滚
          <div
            className={cn(
              'relative shrink-0 self-stretch border-l border-(--picker-footer-border)',
              withSeconds ? 'w-[calc(168px*var(--app-scale))]' : 'w-[calc(112px*var(--app-scale))]',
            )}
          >
            <TimeColumns
              className="absolute inset-0 h-auto"
              value={time}
              withSeconds={withSeconds}
              step={step}
              labels={timeLabels}
              aria-label={labels.time}
              onChange={(next) => onChange(writeValue(date ?? new Date(), next, true, withSeconds))}
            />
          </div>
        )}
      </div>

      {showTime ? (
        <div
          data-slot="date-picker-time-bar"
          className="flex h-[calc(44px*var(--app-scale))] items-center gap-[calc(10px*var(--app-scale))] border-t border-(--picker-footer-border) bg-(--picker-footer-bg) px-[calc(14px*var(--app-scale))]"
        >
          <span className="shrink-0 whitespace-nowrap text-[calc(12px*var(--app-scale))] text-(--text-3)">
            {labels.time}
          </span>
          <TimeField
            size="panel"
            className="shrink-0"
            withSeconds={withSeconds}
            step={step}
            value={time}
            aria-label={labels.time}
            labels={timeLabels}
            onChange={(next) => onChange(writeValue(date ?? new Date(), next, true, withSeconds))}
          />
          <button
            type="button"
            data-slot="date-picker-now"
            className={cn(
              footerTextButtonClass,
              'shrink-0 whitespace-nowrap text-[calc(12px*var(--app-scale))] text-(--button-text-fg)',
            )}
            onClick={handleNow}
          >
            {labels.now}
          </button>
          <span aria-hidden="true" className="flex-1" />
          <Button
            type="button"
            variant="primary"
            size="sm"
            data-slot="date-picker-confirm"
            className="rounded-md px-[calc(12px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))]"
            onClick={() => onCommit(value)}
          >
            {labels.confirm}
          </Button>
        </div>
      ) : (
        <div
          data-slot="date-picker-footer"
          className="flex h-[calc(34px*var(--app-scale))] items-center border-t border-(--picker-footer-border) bg-(--picker-footer-bg) px-[calc(14px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--picker-footer-fg)"
        >
          <button
            type="button"
            data-slot="date-picker-today"
            className={cn(footerTextButtonClass, 'text-(--button-text-fg)')}
            onClick={() => onCommit(formatIsoDate(new Date()))}
          >
            {labels.today}
          </button>
          <span aria-hidden="true" className="flex-1" />
          <button
            type="button"
            data-slot="date-picker-clear"
            className={footerTextButtonClass}
            onClick={() => onCommit(null)}
          >
            {labels.clear}
          </button>
        </div>
      )}
    </div>
  );
}

export interface DatePickerProps extends CalendarLabelProps {
  ref?: Ref<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  'aria-describedby'?: string;
  /** `YYYY-MM-DD`，showTime 时 `YYYY-MM-DD HH:mm[:ss]`；null = 未填 */
  value: string | null;
  onChange: (next: string | null) => void;
  showTime?: boolean;
  withSeconds?: boolean;
  /** ↑↓ 在「分」段上的步进（分钟） */
  step?: number;
  presets?: readonly DatePickerPreset[];
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  labels: DatePickerLabels;
  timeLabels?: TimeFieldLabels;
  /** 触发器尾部出「清空」钮（板上默认不出，故默认 false） */
  allowClear?: boolean;
  size?: 'form' | 'toolbar';
  /** 给外部 FieldLabel 的 htmlFor 用 */
  id?: string;
  className?: string;
  'aria-label': string;
  'aria-invalid'?: boolean;
}

export function DatePicker({
  ref,
  onBlur,
  'aria-describedby': ariaDescribedBy,
  value,
  onChange,
  showTime = false,
  withSeconds = false,
  step,
  presets,
  min,
  max,
  disabled = false,
  placeholder,
  labels,
  timeLabels,
  allowClear = false,
  size = 'form',
  id,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  ...calendarLabels
}: DatePickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ?? '');

  const [draft, setDraft] = useState<string | null>(value);
  const anchorRef = useRef<HTMLDivElement>(null);
  // 面板关闭时焦点会被 Radix 交还给输入框，若不挡一下会立刻再次触发 onFocus 把面板弹回来
  const justClosedRef = useRef(false);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    setText(value ?? '');
    setDraft(value);
  }, [value]);

  const outOfRange = useCallback(
    (date: Date) => {
      const day = formatIsoDate(date);
      if (min && day < min) return true;
      if (max && day > max) return true;
      return false;
    },
    [max, min],
  );

  const parsedText = text.trim() === '' ? null : parseDateValue(text.trim(), showTime);
  const textInvalid = text.trim() !== '' && (parsedText === null || outOfRange(parsedText));
  const invalid = ariaInvalid === true || textInvalid;

  const commitText = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed === '') {
      if (value !== null) {
        lastValueRef.current = null;
        onChange(null);
      }
      return;
    }
    const parsed = parseDateValue(trimmed, showTime);
    if (!parsed || outOfRange(parsed)) return;
    const normalized = formatDateValue(parsed, showTime, withSeconds);
    lastValueRef.current = normalized;
    setText(normalized);
    if (normalized !== value) onChange(normalized);
  }, [onChange, outOfRange, showTime, text, value, withSeconds]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        setDraft(value);
        return;
      }
      justClosedRef.current = true;
      window.setTimeout(() => {
        justClosedRef.current = false;
      }, 0);
    },
    [value],
  );

  const commitAndClose = useCallback(
    (next: string | null) => {
      lastValueRef.current = next;
      setText(next ?? '');
      setDraft(next);
      onChange(next);
      handleOpenChange(false);
    },
    [handleOpenChange, onChange],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className={cn('w-full min-w-0', className)}>
          <InputGroup
            inputSize={size === 'form' ? 'md' : 'sm'}
            data-slot="date-picker-trigger"
            data-state={open ? 'open' : undefined}
            data-disabled={disabled || undefined}
            aria-invalid={invalid || undefined}
            className={cn(
              'gap-[calc(8px*var(--app-scale))]',
              size === 'toolbar' && 'h-[var(--control-btn-md)]',
              disabled && 'text-(--text-faint)',
            )}
          >
            <InputGroupInput
              ref={ref}
              aria-describedby={ariaDescribedBy}
              id={id}
              value={text}
              disabled={disabled}
              aria-label={ariaLabel}
              aria-invalid={invalid || undefined}
              placeholder={placeholder}
              inputMode="numeric"
              autoComplete="off"
              className="font-mono text-[calc(13px*var(--app-scale))]"
              onFocus={() => {
                if (!disabled && !justClosedRef.current) setOpen(true);
              }}
              onMouseDown={() => {
                if (!disabled) setOpen(true);
              }}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                commitText();
                handleOpenChange(false);
              }}
              onBlur={(event) => {
                commitText();
                onBlur?.(event);
              }}
            />
            {allowClear && value !== null && !disabled && (
              <InputGroupSuffix>
                <button
                  type="button"
                  tabIndex={-1}
                  data-slot="date-picker-trigger-clear"
                  aria-label={labels.clear}
                  className="inline-flex cursor-pointer items-center rounded-md text-(--field-icon) hover:text-(--type-2-fg)"
                  onClick={() => commitAndClose(null)}
                >
                  <X aria-hidden="true" className="size-[calc(13px*var(--app-scale))]" />
                </button>
              </InputGroupSuffix>
            )}
            <InputGroupSuffix>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                data-slot="date-picker-trigger-icon"
                disabled={disabled}
                className="inline-flex cursor-pointer items-center disabled:cursor-not-allowed"
                onClick={() => {
                  if (!disabled) setOpen(!open);
                }}
              >
                {/* 不挂 data-icon：global.css 的 `.ui-field [data-icon]` 会把尺寸钉成 15px，板 4.1 是 13px */}
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
        data-slot="date-picker-popover"
        onWheel={(event) => event.stopPropagation()}
        className={cn(
          'max-h-[var(--radix-popper-available-height)] overflow-y-auto p-0',
          showTime
            ? withSeconds
              ? 'w-[calc(448px*var(--app-scale))]'
              : 'w-[calc(392px*var(--app-scale))]'
            : 'w-[calc(280px*var(--app-scale))]',
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          // 点触发器本身不算「点到外面」：否则先关再被 focus / click 弹回来，出现闪烁与错乱
          if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
      >
        <DatePickerPanel
          {...calendarLabels}
          value={showTime ? draft : value}
          showTime={showTime}
          withSeconds={withSeconds}
          step={step}
          presets={presets}
          min={min}
          max={max}
          labels={labels}
          timeLabels={timeLabels}
          onChange={(next) => {
            setDraft(next);
            setText(next ?? '');
          }}
          onCommit={commitAndClose}
        />
      </PopoverContent>
    </Popover>
  );
}
