import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { InputGroup, InputGroupInput, InputGroupPrefix, InputGroupSuffix } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * NumberField —— 数字输入（对标 antd InputNumber）
 *
 * 抄袭源：coss/ui Number Field（MIT，https://coss.com/ui/docs/components/number-field）的
 * 「值 + 右侧步进列」形态与键盘约定；coss 原件走 @base-ui/react 的 NumberField（含 scrub area），
 * 本仓不引第二套 primitive，故只吸收形态/交互约定，实现改造为本仓 ui/input.tsx 的
 * InputGroup + InputGroupInput + Prefix/Suffix 组装 + 受控 draft 状态机。
 *
 * 几何取板 design-explore/pipeline-board/DSAdditions.dc.html 4.4：
 * - 步进列 22px 宽、上下两格各半，左边线与两格之间的横线同为「line-2」发丝线（板值 #f0f0ee）
 * - 步进列**聚焦或 hover 才出现**，平时与普通输入框同貌（板注：「平时藏起来保持和普通输入框同貌」）
 * - 到达 max 时上箭头置灰（板值 #d0d0cd → --text-faint）；对称地到达 min 时下箭头置灰
 * - 值一律 mono（板：class="mono"，「天然对齐」）
 * - 前缀 ¥ / 后缀 % 走 --field-icon（板值 #8f8f8c）
 *
 * 边线色：板上是 #f0f0ee（line-2，比 --border #ececea 再淡一档）。本仓尚无「字段内部发丝线」
 * 语义槽位，暂用同族相邻档 --border；已在交接报告里申请 --field-divider（base = var(--border)，
 * pipeline = #f0f0ee），主进程加完后把下面 STEPPER_LINE 换成新 token 即可。
 */

/** 步进钮的无障碍文案。ui 层不做 i18n，文案一律由外部注入；不传则步进钮 aria-hidden，
 *  无障碍路径交给 role="spinbutton" 的输入本体 + ↑↓ 键（等价能力，不丢功能）。 */
export interface NumberFieldStepLabels {
  increment: string;
  decrement: string;
}

export interface NumberFieldProps {
  /** 受控值。null = 空（不是 0） */
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  /** 步长，默认 1；↑↓ 键与步进钮同步长，Shift 加速 ×10 */
  step?: number;
  /** 小数位。传了就在失焦/步进时按它归一（toFixed） */
  precision?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** 显示用格式化（千分位等）。与 parser 成对使用 */
  formatter?: (value: number) => string;
  /** 把用户输入文本解析回数值；返回 null = 空值 */
  parser?: (text: string) => number | null;
  inputSize?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  stepLabels?: NumberFieldStepLabels;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  onBlur?: () => void;
}

/** 按住步进钮：首次触发后停 400ms 再进入 60ms 连续步进（与浏览器原生 spinner 手感一致） */
const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 60;

const STEPPER_W = 'w-[calc(22px*var(--app-scale))]';

const STEPPER_LINE = 'border-(--border)';

function decimalsOf(step: number): number {
  const text = String(step);
  if (text.includes('e') || text.includes('E')) return 0;
  return text.split('.')[1]?.length ?? 0;
}

function defaultParse(text: string): number | null {
  // 去掉千分位逗号、货币符号、百分号、空格等一切非数字字符，只留数字 / 小数点 / 负号
  const cleaned = text.replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  precision,
  prefix,
  suffix,
  formatter,
  parser,
  inputSize = 'md',
  disabled = false,
  readOnly = false,
  placeholder,
  id,
  name,
  className,
  stepLabels,
  onBlur,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: NumberFieldProps): JSX.Element {
  /** 编辑中的原始文本。null = 未编辑，显示由 value 格式化而来的文本 */
  const [draft, setDraft] = useState<string | null>(null);

  const parse = useCallback((text: string) => (parser ? parser(text) : defaultParse(text)), [parser]);

  const format = useCallback(
    (input: number) => {
      if (formatter) return formatter(input);
      return precision === undefined ? String(input) : input.toFixed(precision);
    },
    [formatter, precision],
  );

  /** 夹到 [min,max] 并按 precision（缺省时按 step 的小数位）归一，顺手抹掉浮点毛刺 */
  const normalize = useCallback(
    (input: number) => {
      let next = input;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      const decimals = Math.min(Math.max(precision ?? decimalsOf(step), 0), 15);
      return Number(next.toFixed(decimals));
    },
    [max, min, precision, step],
  );

  const stepBy = useCallback(
    (direction: 1 | -1, multiplier: number) => {
      if (disabled || readOnly) return;
      const current = draft === null ? value : parse(draft);
      const next =
        current === null && min !== undefined
          ? // 空值 + 有下限：第一步落在下限本身，不要一步跨过它（min=5 时 ↑ 应给 5 而不是 6）
            normalize(min)
          : normalize((current ?? 0) + direction * step * multiplier);
      setDraft(null);
      if (next !== value) onChange(next);
    },
    [disabled, draft, min, normalize, onChange, parse, readOnly, step, value],
  );

  // 连续步进的 interval 回调要读最新的 stepBy（value 每步都在变），用 ref 转发
  const stepByRef = useRef(stepBy);
  useEffect(() => {
    stepByRef.current = stepBy;
  }, [stepBy]);

  const holdRef = useRef<{ timeout?: number; interval?: number }>({});
  const stopHold = useCallback(() => {
    if (holdRef.current.timeout !== undefined) window.clearTimeout(holdRef.current.timeout);
    if (holdRef.current.interval !== undefined) window.clearInterval(holdRef.current.interval);
    holdRef.current = {};
  }, []);
  useEffect(() => stopHold, [stopHold]);

  const startHold = useCallback(
    (direction: 1 | -1) => {
      stopHold();
      stepByRef.current(direction, 1);
      holdRef.current.timeout = window.setTimeout(() => {
        holdRef.current.interval = window.setInterval(() => {
          stepByRef.current(direction, 1);
        }, HOLD_REPEAT_MS);
      }, HOLD_DELAY_MS);
    },
    [stopHold],
  );

  const commitDraft = useCallback(() => {
    if (draft === null) return;
    const parsed = parse(draft);
    setDraft(null);
    const next = parsed === null ? null : normalize(parsed);
    if (next !== value) onChange(next);
  }, [draft, normalize, onChange, parse, value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        stepBy(event.key === 'ArrowUp' ? 1 : -1, event.shiftKey ? 10 : 1);
        return;
      }
      if (event.key === 'Enter') commitDraft();
    },
    [commitDraft, stepBy],
  );

  const atMax = max !== undefined && value !== null && value >= max;
  const atMin = min !== undefined && value !== null && value <= min;
  const showStepper = !disabled && !readOnly;
  const displayText = draft ?? (value === null ? '' : format(value));

  return (
    <InputGroup
      inputSize={inputSize}
      status={ariaInvalid ? 'error' : 'default'}
      data-slot="number-field"
      data-disabled={disabled || undefined}
      className={cn('group/number-field', className)}
    >
      {prefix && <InputGroupPrefix>{prefix}</InputGroupPrefix>}

      <InputGroupInput
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        role="spinbutton"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        aria-valuenow={value ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={displayText || undefined}
        value={displayText}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className="font-mono"
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          // 编辑中先按原样回吐（不夹不归一，和 antd 一致），失焦时才 clamp + precision
          const parsed = parse(text);
          if (parsed !== value) onChange(parsed);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          commitDraft();
          onBlur?.();
        }}
      />

      {suffix && <InputGroupSuffix>{suffix}</InputGroupSuffix>}

      {showStepper && (
        <span
          data-slot="number-field-stepper"
          className={cn(
            'inline-flex flex-col self-stretch border-l opacity-0 transition-opacity',
            'group-hover/number-field:opacity-100 group-focus-within/number-field:opacity-100',
            STEPPER_W,
            STEPPER_LINE,

            'mr-[calc(-1*var(--field-px))]',
          )}
        >
          <StepButton
            direction="up"
            disabled={atMax}
            label={stepLabels?.increment}
            className={cn('border-b', STEPPER_LINE)}
            onStart={() => startHold(1)}
            onStop={stopHold}
          />
          <StepButton
            direction="down"
            disabled={atMin}
            label={stepLabels?.decrement}
            onStart={() => startHold(-1)}
            onStop={stopHold}
          />
        </span>
      )}
    </InputGroup>
  );
}

function StepButton({
  direction,
  disabled,
  label,
  className,
  onStart,
  onStop,
}: {
  direction: 'up' | 'down';
  disabled: boolean;
  label?: string;
  className?: string;
  onStart: () => void;
  onStop: () => void;
}): JSX.Element {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      // 步进钮是鼠标可达性附件：Tab 不落在它上面，键盘走输入本体的 ↑↓
      tabIndex={-1}
      data-slot={`number-field-step-${direction}`}
      disabled={disabled}
      aria-label={label}
      aria-hidden={label === undefined || undefined}
      className={cn(
        'inline-flex flex-1 cursor-pointer items-center justify-center text-(--field-icon)',
        'disabled:cursor-not-allowed disabled:text-(--text-faint)',
        className,
      )}
      // 按下不抢焦点：输入框保持聚焦，步进列不会因失焦而消失
      onMouseDown={(event) => {
        event.preventDefault();
        onStart();
      }}
      onMouseUp={onStop}
      onMouseLeave={onStop}
      onBlur={onStop}
    >
      <Icon aria-hidden="true" className="size-[calc(10px*var(--app-scale))]" />
    </button>
  );
}
