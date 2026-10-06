import { useState, type JSX, type ReactNode } from 'react';
import { NumberField } from '@/components/ui/number-field';

// NumberField 状态矩阵（板 DSAdditions.dc.html 4.4「数字输入」两行）。
// 说明：这是 dev-only 状态矩阵，示例文案直接取自原型板的板上原文，作为夹具数据不进 i18n 资源；
// 组件本身的文案（步进钮 aria-label / 占位符）全部由 props 注入。

const stepLabels = { increment: '增加', decrement: '减少' };

/** 板 4.4 第二行：¥ 前缀 + 千分位（formatter / parser 成对） */
const moneyFormatter = (value: number) => {
  // 千分位只加在整数段：整体 replace 会连小数位一起插逗号
  const [int = '0', frac = '00'] = value.toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
};
const moneyParser = (text: string) => {
  const cleaned = text.replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`numberPopconfirm.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

export default function NumberFieldMatrix(): JSX.Element {
  const [empty, setEmpty] = useState<number | null>(null);
  const [filled, setFilled] = useState<number | null>(128);
  const [focused, setFocused] = useState<number | null>(128);
  const [invalid, setInvalid] = useState<number | null>(-3);
  const [money, setMoney] = useState<number | null>(12600);
  const [percent, setPercent] = useState<number | null>(7.5);
  const [capped, setCapped] = useState<number | null>(100);
  const [count, setCount] = useState<number | null>(2);
  const [small, setSmall] = useState<number | null>(1);
  const [medium, setMedium] = useState<number | null>(12);
  const [large, setLarge] = useState<number | null>(120);

  return (
    <section
      data-testid="numberFieldMatrix"
      className="mt-8 rounded-md border border-border bg-surface-2 p-4"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">数字输入状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">NumberField 五态 / 前后缀与步进 / 三档尺寸</p>
      </div>

      <div className="grid gap-6">
        {/* —— 板 4.4 第一行：五态 —— */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Cell id="NumberField.default" title="默认（空值，占位符）">
            <NumberField
              value={empty}
              onChange={setEmpty}
              placeholder="0"
              stepLabels={stepLabels}
              aria-label="默认数量"
              className="w-[calc(110px*var(--app-scale))]"
            />
          </Cell>

          <Cell id="NumberField.filled" title="填充（值走 mono）">
            <NumberField
              value={filled}
              onChange={setFilled}
              stepLabels={stepLabels}
              aria-label="已填数量"
              className="w-[calc(110px*var(--app-scale))]"
            />
          </Cell>

          <Cell id="NumberField.hover" title="hover / 聚焦：步进列浮现（平时藏起来）">
            <NumberField
              value={focused}
              onChange={setFocused}
              stepLabels={stepLabels}
              aria-label="聚焦数量"
              className="w-[calc(110px*var(--app-scale))]"
            />
          </Cell>

          <Cell id="NumberField.invalid" title="错误（aria-invalid，环常驻）">
            <NumberField
              value={invalid}
              onChange={setInvalid}
              min={0}
              aria-invalid
              stepLabels={stepLabels}
              aria-label="错误数量"
              className="w-[calc(110px*var(--app-scale))]"
            />
          </Cell>

          <Cell id="NumberField.disabled" title="禁用（步进列不出）">
            <NumberField
              value={128}
              onChange={() => undefined}
              disabled
              stepLabels={stepLabels}
              aria-label="禁用数量"
              className="w-[calc(110px*var(--app-scale))]"
            />
          </Cell>

          <Cell id="NumberField.readOnly" title="只读（步进列不出）">
            <NumberField
              value={128}
              onChange={() => undefined}
              readOnly
              stepLabels={stepLabels}
              aria-label="只读数量"
              className="w-[calc(110px*var(--app-scale))]"
            />
          </Cell>
        </div>

        {/* —— 板 4.4 第二行：前后缀与步进 —— */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Cell id="NumberField.currency" title="¥ 前缀 + 千分位（formatter / parser 成对）">
            <NumberField
              value={money}
              onChange={setMoney}
              precision={2}
              step={100}
              min={0}
              formatter={moneyFormatter}
              parser={moneyParser}
              prefix="¥"
              stepLabels={stepLabels}
              aria-label="金额"
              className="w-[calc(170px*var(--app-scale))]"
            />
          </Cell>

          <Cell id="NumberField.percent" title="% 后缀 · precision=1 · step=0.5">
            <NumberField
              value={percent}
              onChange={setPercent}
              precision={1}
              step={0.5}
              min={0}
              max={100}
              suffix="%"
              stepLabels={stepLabels}
              aria-label="税率"
              className="w-[calc(120px*var(--app-scale))]"
            />
          </Cell>

          <Cell id="NumberField.atMax" title="到达 max：上箭头置灰（--text-faint）">
            <NumberField
              value={capped}
              onChange={setCapped}
              min={0}
              max={100}
              stepLabels={stepLabels}
              aria-label="已达上限"
              className="w-[calc(120px*var(--app-scale))]"
            />
          </Cell>

          <Cell id="NumberField.plain" title="纯数量（↑↓ 步进，Shift ×10）">
            <NumberField
              value={count}
              onChange={setCount}
              min={0}
              stepLabels={stepLabels}
              aria-label="附单据数"
              className="w-[calc(110px*var(--app-scale))]"
            />
          </Cell>

          <Cell id="NumberField.sizes" title="三档尺寸 sm / md / lg">
            <div className="flex items-center gap-2">
              <NumberField
                inputSize="sm"
                value={small}
                onChange={setSmall}
                stepLabels={stepLabels}
                aria-label="小号数量"
                className="w-[calc(96px*var(--app-scale))]"
              />
              <NumberField
                inputSize="md"
                value={medium}
                onChange={setMedium}
                stepLabels={stepLabels}
                aria-label="中号数量"
                className="w-[calc(110px*var(--app-scale))]"
              />
              <NumberField
                inputSize="lg"
                value={large}
                onChange={setLarge}
                stepLabels={stepLabels}
                aria-label="大号数量"
                className="w-[calc(124px*var(--app-scale))]"
              />
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}
