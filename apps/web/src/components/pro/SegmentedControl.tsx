import type { ReactNode } from 'react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export interface SegmentedOption<TValue extends string> {
  value: TValue;
  label: ReactNode;
  disabled?: boolean;
}

/**
 * 表单级分段单选：灰槽 + 白色选中块，项等宽撑满。
 * 板：UM06 / UM09 的 `.sg`（槽高 32、项高 28、选中项字重 600）。底座是 Radix RadioGroup，方向键切换。
 */
export function SegmentedControl<TValue extends string>({
  value,
  onValueChange,
  options,
  disabled,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: {
  value: TValue | null;
  onValueChange: (value: TValue) => void;
  options: readonly SegmentedOption<TValue>[];
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label': string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  return (
    <RadioGroupPrimitive.Root
      id={id}
      data-slot="segmented-control"
      orientation="horizontal"
      value={value ?? ''}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      onValueChange={(next) => onValueChange(next as TValue)}
      className={cn(
        'flex h-(--control-md) items-stretch gap-px rounded-4 bg-(--surface-2) p-[calc(2px*var(--app-scale))] data-[disabled]:opacity-50',
        className,
      )}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          data-slot="segmented-control-item"
          className={cn(
            'flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-4 px-2 text-[calc(12.5px*var(--app-scale))] whitespace-nowrap text-(--type-2-fg) outline-none transition-[background,color,box-shadow]',
            'hover:text-text focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)',
            'data-[state=checked]:bg-(--surface) data-[state=checked]:font-semibold data-[state=checked]:text-text data-[state=checked]:shadow-sm',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
