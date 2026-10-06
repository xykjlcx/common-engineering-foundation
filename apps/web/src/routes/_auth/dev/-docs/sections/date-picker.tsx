import { useRef, useState, type JSX, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { DatePicker, DatePickerPanel, type DatePickerPreset } from '@/components/pro/DatePicker';
import { DateRangePicker, DateRangePickerPanel } from '@/components/pro/DateRangePicker';
import { TimeField } from '@/components/pro/TimeField';
import { TimeColumns } from '@/components/pro/TimeColumns';

// 日期时间选择器族状态矩阵（DatePicker / DatePickerPanel / DateRangePicker / DateRangePickerPanel /
// TimeField），对齐 design-explore/pipeline-board/DSAdditions.dc.html 4.1–4.3。
// 说明：这是 dev-only 状态矩阵，示例文案直接取板上原文作夹具数据，不进 i18n 资源；
// 组件本身的文案全部由 props 注入（pro 层零文案）。

const noop = () => undefined;

const labels = {
  today: '今天',
  clear: '清除',
  confirm: '确定',
  now: '此刻',
  time: '时间',
};

const timeLabels = { hour: '时', minute: '分', second: '秒' };

// 板 4.1 面板顶部快捷 chips：「今天 / 明天 / 一周后 / 月末」
const presets: DatePickerPreset[] = [
  { label: '今天', value: '2026-09-03' },
  { label: '明天', value: '2026-09-04' },
  { label: '一周后', value: '2026-09-10' },
  { label: '月末', value: '2026-09-30' },
];

const rangeLabels = {
  start: '开始日期',
  end: '结束日期',
  clear: '清除',
  confirm: '确定',
  days: (count: number) => `· ${count} 天`,
  presets: {
    today: '今天',
    last7: '近 7 天',
    last30: '近 30 天',
    thisMonth: '本月',
    lastMonth: '上月',
    thisQuarter: '本季度',
  },
};

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`datePicker.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

export default function DatePickerMatrix(): JSX.Element {
  const { t } = useTranslation();
  const invalidRef = useRef<HTMLInputElement>(null);
  const [single, setSingle] = useState<string | null>('2026-09-03');
  const [withTime, setWithTime] = useState<string | null>('2026-09-03 14:30');
  const [clearable, setClearable] = useState<string | null>('2026-09-03');
  const [toolbar, setToolbar] = useState<string | null>(null);
  const [panelSingle, setPanelSingle] = useState<string | null>('2026-09-03');
  const [panelTime, setPanelTime] = useState<string | null>('2026-09-03 14:30');
  const [range, setRange] = useState<[string, string] | null>(['2026-08-05', '2026-09-03']);
  const [panelRange, setPanelRange] = useState<[string, string] | null>(['2026-09-01', '2026-09-03']);
  const [time, setTime] = useState<string | null>('14:30');
  const [timeSeconds, setTimeSeconds] = useState<string | null>('14:30:00');

  return (
    <section data-testid="datePickerMatrix" className="mt-8 rounded-md border border-border bg-surface-2 p-4">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">日期时间选择器族状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">
          DatePicker / DatePickerPanel / DateRangePicker / DateRangePickerPanel / TimeField（板 4.1–4.3）
        </p>
      </div>

      <div className="grid gap-6">
        {/* ── 4.1 触发器 ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Cell id="DatePicker.default" title="触发器：默认（未填，可直接手输 YYYY-MM-DD）">
            <DatePicker
              value={null}
              aria-label="选择日期"
              placeholder="选择日期"
              locale="zh-CN"
              labels={labels}
              onChange={noop}
            />
          </Cell>

          <Cell id="DatePicker.filled" title="触发器：已选值（mono，与表格日期列同字）">
            <DatePicker
              value={single}
              aria-label="入职日期"
              placeholder="选择日期"
              locale="zh-CN"
              labels={labels}
              presets={presets}
              onChange={setSingle}
            />
          </Cell>

          <Cell id="DatePicker.showTime" title="触发器：showTime（YYYY-MM-DD HH:mm）">
            <DatePicker
              showTime
              value={withTime}
              aria-label="生效时间"
              placeholder="选择日期时间"
              locale="zh-CN"
              labels={labels}
              timeLabels={timeLabels}
              onChange={setWithTime}
            />
          </Cell>

          <Cell id="DatePicker.invalid" title="触发器：错误（非法日期保留输入并标红，不吞掉）">
            <FieldLabel htmlFor="docs-date-bridge">{t('dev.themeStates.fieldInvalid')}</FieldLabel>
            <DatePicker
              id="docs-date-bridge"
              ref={invalidRef}
              aria-describedby="docs-date-bridge-error"
              value="2026-13-01"
              aria-label="非法日期"
              aria-invalid
              locale="zh-CN"
              labels={labels}
              onChange={noop}
            />
            <FieldError id="docs-date-bridge-error">{t('dev.themeStates.fieldInvalidDesc')}</FieldError>
          </Cell>

          <Cell id="DatePicker.disabled" title="触发器：禁用">
            <DatePicker
              disabled
              value="2026-09-03"
              aria-label="禁用日期"
              locale="zh-CN"
              labels={labels}
              onChange={noop}
            />
          </Cell>

          <Cell id="DatePicker.allowClear" title="触发器：allowClear（尾部出清空钮）">
            <DatePicker
              allowClear
              value={clearable}
              aria-label="可清空日期"
              locale="zh-CN"
              labels={labels}
              onChange={setClearable}
            />
          </Cell>

          <Cell id="DatePicker.toolbar" title="触发器：toolbar 尺寸（32 档）">
            <DatePicker
              size="toolbar"
              value={toolbar}
              aria-label="工具条日期"
              placeholder="选择日期"
              locale="zh-CN"
              labels={labels}
              onChange={setToolbar}
            />
          </Cell>
        </div>

        {/* ── 4.1 面板（常显） ───────────────────────────────────────────── */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Cell id="DatePickerPanel.single" title="面板（单日期）：快捷 chips + 日历 + 今天 / 清除">
            <div className="w-[calc(280px*var(--app-scale))] overflow-hidden rounded-(--overlay-radius) border border-(--overlay-border) bg-(--overlay-bg) shadow-(--overlay-shadow-popover)">
              <DatePickerPanel
                value={panelSingle}
                presets={presets}
                locale="zh-CN"
                labels={labels}
                onChange={setPanelSingle}
                onCommit={setPanelSingle}
              />
            </div>
          </Cell>

          <Cell id="DatePickerPanel.showTime" title="面板（日期 + 时间）：底栏三段式时分 + 此刻 + 确定">
            <div className="w-[calc(392px*var(--app-scale))] overflow-hidden rounded-(--overlay-radius) border border-(--overlay-border) bg-(--overlay-bg) shadow-(--overlay-shadow-popover)">
              <DatePickerPanel
                showTime
                value={panelTime}
                locale="zh-CN"
                labels={labels}
                timeLabels={timeLabels}
                onChange={setPanelTime}
                onCommit={setPanelTime}
              />
            </div>
          </Cell>
        </div>

        {/* ── 4.2 区间 ──────────────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Cell id="DateRangePicker.empty" title="区间触发器：默认（两段各自可手输）">
            <DateRangePicker
              value={null}
              aria-label="日期区间"
              locale="zh-CN"
              labels={rangeLabels}
              onChange={noop}
            />
          </Cell>

          <Cell id="DateRangePicker.filled" title="区间触发器：已选（起 ~ 止）">
            <DateRangePicker
              value={range}
              aria-label="日期区间"
              locale="zh-CN"
              labels={rangeLabels}
              onChange={setRange}
            />
          </Cell>

          <Cell id="DateRangePicker.invalid" title="区间触发器：错误（止早于起）">
            <DateRangePicker
              value={['2026-09-03', '2026-08-05']}
              aria-label="非法区间"
              locale="zh-CN"
              labels={rangeLabels}
              onChange={noop}
            />
          </Cell>

          <Cell id="DateRangePicker.disabled" title="区间触发器：禁用">
            <DateRangePicker
              disabled
              value={['2026-08-05', '2026-09-03']}
              aria-label="禁用区间"
              locale="zh-CN"
              labels={rangeLabels}
              onChange={noop}
            />
          </Cell>

          <Cell id="DateRangePicker.toolbar" title="区间触发器：toolbar 尺寸（32 档）">
            <DateRangePicker
              size="toolbar"
              value={['2026-08-05', '2026-09-03']}
              aria-label="工具条区间"
              locale="zh-CN"
              labels={rangeLabels}
              onChange={noop}
            />
          </Cell>

          <Cell id="DateRangePicker.narrow" title="区间触发器：筛选面板窄宽（尾部图标完整）">
            <div className="w-[calc(var(--filter-panel-w)-20px*var(--app-scale))]">
              <DateRangePicker
                size="toolbar"
                value={['2026-08-05', '2026-09-03']}
                aria-label="窄宽区间"
                locale="zh-CN"
                labels={rangeLabels}
                onChange={noop}
              />
            </div>
          </Cell>
        </div>

        <div className="grid gap-4">
          <Cell id="DateRangePickerPanel.dual" title="区间面板（双月 + 快捷列 + 底栏回显）">
            <div className="w-[calc(648px*var(--app-scale))] max-w-full overflow-hidden rounded-(--overlay-radius) border border-(--overlay-border) bg-(--overlay-bg) shadow-(--overlay-shadow-popover)">
              <DateRangePickerPanel
                value={panelRange}
                locale="zh-CN"
                labels={rangeLabels}
                onChange={setPanelRange}
                onCommit={setPanelRange}
              />
            </div>
          </Cell>
        </div>

        {/* ── 4.3 TimeField ─────────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Cell id="TimeField.withPicker" title="三段式 + 滚动列：聚焦弹出时 / 分滚选，键盘输入并存">
            <TimeField
              withPicker
              value={time}
              aria-label="时间（滚选）"
              labels={timeLabels}
              onChange={setTime}
            />
          </Cell>

          <Cell id="TimeColumns.static" title="滚动列本体（常显）：当前项高亮并滚到中央，点选即写入">
            <div className="inline-flex overflow-hidden rounded-md border border-(--picker-footer-border) bg-(--overlay-bg)">
              <TimeColumns value={time} aria-label="时间" labels={timeLabels} onChange={setTime} />
            </div>
          </Cell>

          <Cell id="TimeField.empty" title="三段式：默认（占位 --:--）">
            <TimeField value={null} aria-label="时间" labels={timeLabels} onChange={noop} />
          </Cell>

          <Cell id="TimeField.filled" title="三段式：填充（↑↓ 步进 / 输满两位跳段 / 退格回段）">
            <TimeField value={time} aria-label="时间" labels={timeLabels} onChange={setTime} />
          </Cell>

          <Cell id="TimeField.withSeconds" title="三段式：带秒">
            <TimeField
              withSeconds
              value={timeSeconds}
              aria-label="时间（带秒）"
              labels={timeLabels}
              onChange={setTimeSeconds}
            />
          </Cell>

          <Cell id="TimeField.invalid" title="三段式：错误（aria-invalid）">
            <TimeField value="14:30" aria-label="非法时间" aria-invalid labels={timeLabels} onChange={noop} />
          </Cell>

          <Cell id="TimeField.disabled" title="三段式：禁用">
            <TimeField disabled value="14:30" aria-label="禁用时间" labels={timeLabels} onChange={noop} />
          </Cell>

          <Cell id="TimeField.panel" title="三段式：panel 档（28 高、无尾图标，面板底栏那只）">
            <TimeField size="panel" value="14:30" aria-label="面板时间" labels={timeLabels} onChange={noop} />
          </Cell>
        </div>
      </div>
    </section>
  );
}
