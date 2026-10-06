/**
 * Calendar —— DayPicker（@daypicker/react 10.0.1，MIT）的本仓 token 化封装。
 *
 * 抄袭源：shadcn/ui calendar（MIT，"包 DayPicker + classNames 全量接管" 的做法）
 *        + 本仓 --calendar-* 族改造（不引入 daypicker 自带 style.css，全部走 classNames）。
 *
 * 视觉真相源：design-explore/pipeline-board/DSAdditions.dc.html 4.1 / 4.2 面板。
 * 逐值出处（板 → 本文件）：
 *   · 月块       4.1 `width:252px; gap:4px`（列向）
 *   · 导航行     4.1 `height:28px; justify-content:space-between`；左右钮 `24×24; radius:4`，chevron 13px
 *   · 标题下拉   4.1 「2026 年 ▾ 9 月 ▾」`height:24px; padding:0 6px; gap:3px; radius:4`，13px/500，chevron 11px
 *   · 星期行     4.1 `width:30px; height:22px; font-size:11.5px; color:#8f8f8c`(--calendar-head-fg)
 *   · 日格       4.1 `30×30`(--calendar-cell-size)`; font-size:12.5px; radius:4`
 *   · 今天       4.1 说明「今天只描字 + 底部小点，不占实底」→ --calendar-fg-today + 3px 小点
 *   · 选中       4.1 `background:#f97316; color:#fff; font-weight:500`(--calendar-bg-selected/-fg-selected)
 *   · 范围       4.2 首 `radius:4px 0 0 4px` / 中段 `background:#fff4e9`(--calendar-bg-range) 方角 / 尾 `0 4px 4px 0`
 *   · 双月间距   4.2 `gap:18px`
 *
 * 板上「252 月块里放 210 的日格网格（7×30）」是原稿几何；宽度照抄，对齐板没给，这里居中。
 *
 * 文案：星期 / 月份 / 年份默认走 DayPicker 内置英文；给了 `locale`（BCP-47）就用 Intl 派生，
 * 也可以用 weekdayNames / monthNames / formatYear 直接注入。本层零硬编码文案。
 */
import { useMemo, type JSX } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DayPicker,
  type ChevronProps,
  type ClassNames,
  type DateRange,
  type Formatters,
  type Labels,
  type Matcher,
} from '@daypicker/react';

import { cn } from '@/lib/utils';

export type { DateRange } from '@daypicker/react';

const dayButtonClass = [
  'flex size-full cursor-pointer items-center justify-center rounded-md',
  'text-[calc(12.5px*var(--app-scale))] text-(--calendar-fg) outline-none',
  'transition-[background,color] hover:bg-(--calendar-bg-hover)',
  'focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)',
  'disabled:cursor-not-allowed disabled:text-(--text-faint) disabled:hover:bg-transparent',
  'aria-disabled:cursor-not-allowed aria-disabled:text-(--text-faint)',
].join(' ');

/**
 * 已选/范围端点格：td 铺底 + 按钮透明，按钮的字色与去 hover 都靠子选择器提权。
 *
 * 字色一律带 `data-[selected=true]:` 前缀：选中格若同时是「今天」，td 上会同时挂 today 与 selected
 * 两个类，两条 `.cls > button` 的字色规则优先级相同（0,1,1），谁生效取决于 CSS 出场顺序——
 * 实测「今天且选中」那格被 today 的橙字压住，橙底橙字直接看不见数字。
 * 加 data 属性把选中态提到 (0,2,1)，顺序无关地压过 today。
 */
const filledDayClass = [
  'bg-(--calendar-bg-selected) font-medium',
  'data-[selected=true]:text-(--calendar-fg-selected)',
  '[&>button]:bg-transparent [&>button]:font-medium',
  'data-[selected=true]:[&>button]:text-(--calendar-fg-selected)',
  '[&>button]:hover:bg-transparent',
].join(' ');

const baseClassNames = {
  root: 'relative w-fit',
  months: 'flex gap-[calc(18px*var(--app-scale))]',
  month: [
    'grid w-[calc(252px*var(--app-scale))] grid-cols-[auto_1fr_auto]',
    'gap-y-[calc(4px*var(--app-scale))]',
  ].join(' '),
  nav: 'contents',
  button_previous: [
    'col-start-1 row-start-1 inline-flex size-[calc(24px*var(--app-scale))] cursor-pointer',
    'items-center justify-center self-center rounded-md text-(--calendar-nav-fg)',
    'hover:bg-(--calendar-nav-bg-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-40',
  ].join(' '),
  button_next: [
    'col-start-3 row-start-1 inline-flex size-[calc(24px*var(--app-scale))] cursor-pointer',
    'items-center justify-center self-center rounded-md text-(--calendar-nav-fg)',
    'hover:bg-(--calendar-nav-bg-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-40',
  ].join(' '),
  month_caption: [
    'col-start-2 row-start-1 flex h-[calc(28px*var(--app-scale))] items-center justify-center',
    'text-[calc(13px*var(--app-scale))] font-medium text-(--calendar-fg)',
  ].join(' '),
  dropdowns: 'inline-flex items-center gap-[calc(2px*var(--app-scale))]',
  dropdown_root: [
    'relative inline-flex h-[calc(24px*var(--app-scale))] items-center',
    'gap-[calc(3px*var(--app-scale))] rounded-md px-[calc(6px*var(--app-scale))]',
    'hover:bg-(--calendar-nav-bg-hover)',
    '[&_svg]:size-[calc(11px*var(--app-scale))] [&_svg]:text-(--calendar-head-fg)',
  ].join(' '),
  dropdown: 'absolute inset-0 size-full cursor-pointer appearance-none opacity-0',
  caption_label: 'inline-flex items-center gap-[calc(3px*var(--app-scale))]',
  chevron: 'size-[calc(13px*var(--app-scale))] shrink-0',
  // w-max + justify-self-start：table 是 grid item，默认 stretch 会被拉到 252 宽，
  // table-layout:auto 再把 252 均分给 7 列（实测 36px/格），--calendar-cell-size 就形同虚设。

  month_grid: 'col-span-3 col-start-1 row-start-2 w-max table-fixed justify-self-center border-collapse',
  weekdays: '',
  weekday: [
    'h-[calc(22px*var(--app-scale))] w-(--calendar-cell-size) font-normal',
    'text-[calc(11.5px*var(--app-scale))] text-(--calendar-head-fg)',
  ].join(' '),
  weeks: '',
  week: '',
  day: 'relative h-(--calendar-cell-size) w-(--calendar-cell-size) p-0 text-center align-middle',
  day_button: dayButtonClass,
  outside: '[&>button]:text-(--calendar-fg-outside)',
  hidden: 'invisible',
  today: [
    'text-(--calendar-fg-today) [&>button]:font-medium [&>button]:text-(--calendar-fg-today)',
    'after:pointer-events-none after:absolute after:bottom-[calc(3px*var(--app-scale))]',
    'after:left-1/2 after:size-[calc(3px*var(--app-scale))] after:-translate-x-1/2',
    'after:rounded-full after:bg-(--calendar-fg-today) after:content-[""]',
    'data-[selected=true]:after:bg-(--calendar-fg-selected)',
  ].join(' '),
} satisfies Partial<ClassNames>;

const singleClassNames: Partial<ClassNames> = {
  ...baseClassNames,
  selected: `rounded-md ${filledDayClass}`,
};

const rangeClassNames: Partial<ClassNames> = {
  ...baseClassNames,
  // range 模式下 selected 会同时命中首/中/尾三格，留空交给三个更具体的状态类，避免同优先级 bg 打架
  selected: '',
  range_start: `rounded-l-md ${filledDayClass}`,
  range_end: `rounded-r-md ${filledDayClass}`,
  range_middle: [
    'bg-(--calendar-bg-range)',
    '[&>button]:rounded-none [&>button]:text-(--calendar-fg-range)',
  ].join(' '),
};

function CalendarChevron({ orientation, className }: ChevronProps): JSX.Element {
  if (orientation === 'left') return <ChevronLeft aria-hidden="true" className={className} />;
  if (orientation === 'right') return <ChevronRight aria-hidden="true" className={className} />;
  return <ChevronDown aria-hidden="true" className={className} />;
}

export interface CalendarLabelProps {
  /** BCP-47 语言标签。给了就用 Intl 派生星期 / 月份 / 年份文案，并按语言决定「年 月」还是「月 年」顺序 */
  locale?: string;
  /** 星期文案，索引 = Date#getDay()（0 = 周日）。优先级高于 locale */
  weekdayNames?: readonly string[];
  /** 月份文案，索引 = 月份（0 = 一月）。优先级高于 locale */
  monthNames?: readonly string[];
  /** 年份下拉文案。优先级高于 locale */
  formatYear?: (year: number) => string;
  /** 无障碍文案（上/下月钮、年月下拉、日格 aria-label…）；不给就是 DayPicker 内置英文。
   *  刻意不叫 `labels`：上层 DatePicker / DateRangePicker 的 `labels` 是可见文案，两者不能撞名。 */
  calendarAriaLabels?: Partial<Labels>;
}

interface CalendarBaseProps extends CalendarLabelProps {
  className?: string;
  /** 受控当前月 */
  month?: Date;
  onMonthChange?: (month: Date) => void;
  defaultMonth?: Date;

  numberOfMonths?: number;
  /** 禁用日矩阵，直接透传 DayPicker matcher */
  disabled?: Matcher | Matcher[];
  /** 月份导航下界，缺省为 today 的 100 年前（captionLayout=dropdown 必须显式给，否则默认锁到今年年底） */
  startMonth?: Date;
  /** 月份导航上界，缺省为 today 的 20 年后 */
  endMonth?: Date;
  today?: Date;
  autoFocus?: boolean;
  id?: string;
  'aria-label'?: string;
}

export type CalendarProps = CalendarBaseProps &
  (
    | { mode?: 'single'; selected?: Date | undefined; onSelect?: (day: Date | undefined) => void }
    | { mode: 'range'; selected?: DateRange | undefined; onSelect?: (range: DateRange | undefined) => void }
  );

export function Calendar(props: CalendarProps): JSX.Element {
  const {
    className,
    locale,
    weekdayNames,
    monthNames,
    formatYear,
    calendarAriaLabels,
    startMonth,
    endMonth,
    today,
    ...rest
  } = props;

  const formatters = useMemo<Partial<Formatters>>(() => {
    const next: Partial<Formatters> = {};
    const weekdayFmt = locale ? new Intl.DateTimeFormat(locale, { weekday: 'narrow' }) : null;

    const monthFmt = locale ? new Intl.DateTimeFormat(locale, { month: 'short' }) : null;
    const yearFmt = locale ? new Intl.DateTimeFormat(locale, { year: 'numeric' }) : null;

    if (weekdayNames || weekdayFmt) {
      next.formatWeekdayName = (day: Date) => weekdayNames?.[day.getDay()] ?? weekdayFmt?.format(day) ?? '';
    }
    if (monthNames || monthFmt) {
      next.formatMonthDropdown = (month: Date) =>
        monthNames?.[month.getMonth()] ?? monthFmt?.format(month) ?? '';
    }
    if (formatYear || yearFmt) {
      next.formatYearDropdown = (year: Date) =>
        formatYear?.(year.getFullYear()) ?? yearFmt?.format(year) ?? '';
    }
    return next;
  }, [formatYear, locale, monthNames, weekdayNames]);

  const navRange = useMemo(() => {
    const anchor = today ?? new Date();
    return {
      start: startMonth ?? new Date(anchor.getFullYear() - 100, 0, 1),
      end: endMonth ?? new Date(anchor.getFullYear() + 20, 11, 31),
    };
  }, [endMonth, startMonth, today]);

  const shared = {
    ...rest,
    today,
    startMonth: navRange.start,
    endMonth: navRange.end,
    className: cn('text-(--calendar-fg)', className),
    captionLayout: 'dropdown' as const,
    navLayout: 'around' as const,
    weekStartsOn: 1 as const,

    showOutsideDays: false,
    fixedWeeks: false,
    formatters,
    labels: calendarAriaLabels,
    locale: locale ? { code: locale } : undefined,
    components: { Chevron: CalendarChevron },
  };

  if (props.mode === 'range') {
    return (
      <DayPicker
        {...shared}
        data-slot="calendar"
        mode="range"
        // 区间选满后再点一次 = 重新起一段（antd RangePicker 语义），不走 daypicker 默认的「延长/收缩」
        resetOnSelect
        classNames={rangeClassNames}
        selected={props.selected}
        onSelect={(range) => props.onSelect?.(range)}
      />
    );
  }

  return (
    <DayPicker
      {...shared}
      data-slot="calendar"
      mode="single"
      classNames={singleClassNames}
      selected={props.selected}
      onSelect={(day) => props.onSelect?.(day)}
    />
  );
}

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
export const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** `YYYY-MM-DD` */
export function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** `HH:mm` / `HH:mm:ss` */
export function formatIsoTime(date: Date, withSeconds = false): string {
  const head = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return withSeconds ? `${head}:${pad2(date.getSeconds())}` : head;
}

/** `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm[:ss]` */
export function formatDateValue(date: Date, withTime = false, withSeconds = false): string {
  const day = formatIsoDate(date);
  return withTime ? `${day} ${formatIsoTime(date, withSeconds)}` : day;
}

/**
 * 严格解析 `YYYY-MM-DD[ HH:mm[:ss]]`。格式不符、或日期不真实存在（2026-02-31 / 2026-13-01）一律返回 null，
 * 不做 Date 构造器的溢出容忍——手输非法值要能标红而不是被悄悄改成别的日子。
 */
export function parseDateValue(value: string, withTime = false): Date | null {
  const text = value.trim();
  if (text === '') return null;
  if (!(withTime ? ISO_DATETIME_RE : ISO_DATE_RE).test(text)) return null;

  const [datePart, timePart] = text.split(' ');
  if (!datePart) return null;
  const [yearText, monthText, dayText] = datePart.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (withTime) {
    const [hourText, minuteText, secondText] = (timePart ?? '').split(':');
    hours = Number(hourText);
    minutes = Number(minuteText);
    seconds = secondText === undefined ? 0 : Number(secondText);
    if (hours > 23 || minutes > 59 || seconds > 59) return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** 两个 `YYYY-MM-DD` 之间的天数（含首尾）；任一非法返回 0 */
export function countIsoDays(from: string, to: string): number {
  const start = parseDateValue(from);
  const end = parseDateValue(to);
  if (!start || !end) return 0;
  const ms =
    Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.floor(ms / 86_400_000) + 1;
}
