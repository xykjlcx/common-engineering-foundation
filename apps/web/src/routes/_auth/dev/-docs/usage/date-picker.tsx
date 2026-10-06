import { useState } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { DatePicker, type DatePickerLabels, type DatePickerPreset } from '@/components/pro/DatePicker';
import {
  DateRangePicker,
  type DateRangePickerLabels,
  type DateRangeValue,
} from '@/components/pro/DateRangePicker';
import { TimeField } from '@/components/pro/TimeField';
import type { UsageDoc } from '../types';

/* 日期选择「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

const labels: DatePickerLabels = {
  today: '今天',
  clear: '清除',
  confirm: '确定',
  now: '此刻',
  time: '时间',
};

const timeLabels = { hour: '时', minute: '分', second: '秒' };

const presets: DatePickerPreset[] = [
  { label: '今天', value: '2026-09-04' },
  { label: '明天', value: '2026-09-05' },
  { label: '一周后', value: '2026-09-11' },
];

const rangeLabels: DateRangePickerLabels = {
  start: '开始日期',
  end: '结束日期',
  clear: '清除',
  confirm: '确定',
  days: (count) => `· ${count} 天`,
  presets: { today: '今天', last7: '近 7 天', last30: '近 30 天', thisMonth: '本月' },
};

function SingleDemo() {
  const [value, setValue] = useState<string | null>('2026-09-04');

  return (
    <div className="flex flex-col gap-2">
      <Field>
        <FieldLabel htmlFor="usage-date-single">入职日期</FieldLabel>
        <DatePicker
          id="usage-date-single"
          aria-label="入职日期"
          placeholder="选择日期"
          locale="zh-CN"
          labels={labels}
          presets={presets}
          allowClear
          value={value}
          onChange={setValue}
        />
      </Field>
      <p className="text-xs text-(--text-3)">当前值：{value ?? 'null'}</p>
    </div>
  );
}

function ShowTimeDemo() {
  const [value, setValue] = useState<string | null>('2026-09-04 14:30');

  return (
    <div className="flex flex-col gap-2">
      <DatePicker
        showTime
        aria-label="生效时间"
        placeholder="选择日期时间"
        locale="zh-CN"
        labels={labels}
        timeLabels={timeLabels}
        min="2026-01-01"
        max="2026-12-31"
        value={value}
        onChange={setValue}
      />
      <p className="text-xs text-(--text-3)">当前值：{value ?? 'null'}</p>
    </div>
  );
}

function RangeDemo() {
  const [range, setRange] = useState<DateRangeValue | null>(['2026-08-05', '2026-09-04']);

  return (
    <div className="flex flex-col gap-2">
      <DateRangePicker
        aria-label="统计区间"
        locale="zh-CN"
        labels={rangeLabels}
        value={range}
        onChange={setRange}
      />
      <p className="text-xs text-(--text-3)">当前值：{range ? `${range[0]} ~ ${range[1]}` : 'null'}</p>
    </div>
  );
}

function TimeOnlyDemo() {
  const [time, setTime] = useState<string | null>('09:30');

  return (
    <div className="flex flex-col gap-2">
      <TimeField
        aria-label="每日执行时间"
        labels={timeLabels}
        step={5}
        withPicker
        value={time}
        onChange={setTime}
      />
      <p className="text-xs text-(--text-3)">当前值：{time ?? 'null'}</p>
    </div>
  );
}

export const usage: UsageDoc = {
  when:
    '选一个日期用 DatePicker，选一段日期用 DateRangePicker，只选时分秒用 TimeField——三件都是「可手输的输入框 + 浮层面板」，' +
    '键盘直接敲 2026-09-04 与鼠标点日历是并存的两条路，不要为了「防止乱填」把输入框改成只读。' +
    '带时间的场景传 showTime，此时语义变成两步提交：点日只改草稿不关面板，按「确定」才真正回吐值。' +
    '需要把面板嵌进抽屉或卡片里常显时，用对应的 DatePickerPanel / DateRangePickerPanel（受控草稿 onChange + 提交 onCommit 两个回调），不要去改触发器。',
  examples: [
    {
      title: '单日期 + 快捷项',
      description: '值是 YYYY-MM-DD 字符串，未填是 null；presets 就是面板顶部那排快捷 chip。',
      code: `import { useState } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { DatePicker, type DatePickerLabels, type DatePickerPreset } from '@/components/pro/DatePicker';

const labels: DatePickerLabels = {
  today: '今天',
  clear: '清除',
  confirm: '确定',
  now: '此刻',
  time: '时间',
};

const presets: DatePickerPreset[] = [
  { label: '今天', value: '2026-09-04' },
  { label: '明天', value: '2026-09-05' },
  { label: '一周后', value: '2026-09-11' },
];

export function HireDateField() {
  const [value, setValue] = useState<string | null>('2026-09-04');

  return (
    <Field>
      <FieldLabel htmlFor="hire-date">入职日期</FieldLabel>
      <DatePicker
        id="hire-date"
        aria-label="入职日期"
        placeholder="选择日期"
        locale="zh-CN"
        labels={labels}
        presets={presets}
        allowClear
        value={value}
        onChange={setValue}
      />
    </Field>
  );
}`,
      render: SingleDemo,
    },
    {
      title: '日期时间（两步提交）',
      description: 'showTime 下值变成 YYYY-MM-DD HH:mm；min / max 也是字符串，越界的日子在面板里直接禁用。',
      code: `import { useState } from 'react';
import { DatePicker } from '@/components/pro/DatePicker';

export function EffectiveAtField() {
  const [value, setValue] = useState<string | null>('2026-09-04 14:30');

  return (
    <DatePicker
      showTime
      aria-label="生效时间"
      placeholder="选择日期时间"
      locale="zh-CN"
      labels={labels}
      timeLabels={{ hour: '时', minute: '分', second: '秒' }}
      min="2026-01-01"
      max="2026-12-31"
      value={value}
      onChange={setValue}
    />
  );
}`,
      render: ShowTimeDemo,
    },
    {
      title: '日期范围',
      description: '值是 [起, 止] 二元组，两侧都是 YYYY-MM-DD；labels.presets 里写了文案的快捷项才会渲染。',
      code: `import { useState } from 'react';
import {
  DateRangePicker,
  type DateRangePickerLabels,
  type DateRangeValue,
} from '@/components/pro/DateRangePicker';

const rangeLabels: DateRangePickerLabels = {
  start: '开始日期',
  end: '结束日期',
  clear: '清除',
  confirm: '确定',
  days: (count) => \`· \${count} 天\`,
  presets: { today: '今天', last7: '近 7 天', last30: '近 30 天', thisMonth: '本月' },
};

export function RangeFilter() {
  const [range, setRange] = useState<DateRangeValue | null>(['2026-08-05', '2026-09-04']);

  return (
    <DateRangePicker
      aria-label="统计区间"
      locale="zh-CN"
      labels={rangeLabels}
      value={range}
      onChange={setRange}
    />
  );
}`,
      render: RangeDemo,
    },
    {
      title: '只选时间 TimeField',
      description: '三段式手输（时 / 分 / 秒），withPicker 再挂一列滚选；step 是分钟段上按上下键的步进。',
      code: `import { useState } from 'react';
import { TimeField } from '@/components/pro/TimeField';

export function DailyRunAtField() {
  const [time, setTime] = useState<string | null>('09:30');

  return (
    <TimeField
      aria-label="每日执行时间"
      labels={{ hour: '时', minute: '分', second: '秒' }}
      step={5}
      withPicker
      value={time}
      onChange={setTime}
    />
  );
}`,
      render: TimeOnlyDemo,
    },
  ],
  notes: [
    '与 antd 的最大差异：值是字符串不是 Date / dayjs 对象——YYYY-MM-DD、YYYY-MM-DD HH:mm[:ss]、TimeField 的 HH:mm[:ss]，未填统一是 null。所以不需要 format / valueFormat，也不需要引 dayjs。',
    'antd 的 RangePicker 值是 [Dayjs, Dayjs]，这里是 [string, string]；半截草稿用空串表示（如 ["2026-08-05", ""]）。',
    'labels 是必填的：pro 层零文案，「今天 / 清除 / 确定 / 此刻 / 时间」全部由业务层从 i18n 取好再传进来。aria-label 同样必填。',
    'antd 用 disabledDate 函数禁用日期，这里用 min / max 两个字符串边界；更复杂的禁用矩阵请直接用 ui/Calendar 的 disabled matcher 自己拼面板。',
    '手输非法值不会被吞掉：输入框保留原文并挂 aria-invalid，等用户改对了再提交，所以业务层不要在 onChange 里假设值一定合法。',
    'showTime 的「点日不提交、按确定才提交」是刻意的，与 antd 一致；如果你发现选完日期值没变，说明面板还在等「确定」。',
  ],
};
