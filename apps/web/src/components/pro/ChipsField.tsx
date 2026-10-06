import { useMemo, useState, type JSX, type Ref, type FocusEventHandler } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PickerPopover, type PickerNode, type PickerPopoverLabels } from './PickerPopover';

export interface ChipsFieldLabels extends PickerPopoverLabels {
  /** 虚线「添加」chip 文案 */
  add: string;
  /** 单个 chip 删除按钮的可访问名，如 (label) => `移除 ${label}` */
  remove: (label: string) => string;
}

export interface ChipsFieldProps {
  ref?: Ref<HTMLButtonElement>;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  'aria-describedby'?: string;
  nodes: PickerNode[];
  value: string[];
  onChange: (value: string[]) => void;
  labels: ChipsFieldLabels;
  disabled?: boolean;
  /** 添加按钮 id，供 FieldLabel.htmlFor 与 RHF 的实际焦点目标使用。 */
  id?: string;
  'aria-label': string;
  'aria-invalid'?: boolean;
  className?: string;
}

const chipClass =
  'flex h-[calc(24px*var(--app-scale))] items-center gap-[calc(6px*var(--app-scale))] rounded-(--badge-radius) px-[calc(9px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))]';

export function ChipsField({
  ref,
  onBlur,
  'aria-describedby': ariaDescribedBy,
  nodes,
  value,
  onChange,
  labels,
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: ChipsFieldProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const byValue = useMemo(() => new Map(nodes.map((node) => [node.value, node])), [nodes]);

  const remove = (item: string) => {
    onChange(value.filter((entry) => entry !== item));
  };

  return (
    <div
      // group + aria-label 让容器本身可被读屏识别为一个具名控件组；
      // 不用 listbox/combobox 是因为真正的选项列表在 PickerPopover 里，重复角色会误导读屏
      role="group"
      aria-label={ariaLabel}
      data-slot="chips-field"
      data-disabled={disabled || undefined}
      aria-invalid={ariaInvalid || undefined}
      className={cn(
        'ui-field flex min-h-[var(--control-md)] flex-wrap items-center gap-[calc(6px*var(--app-scale))] rounded-md border px-[calc(9px*var(--app-scale))] py-[calc(4px*var(--app-scale))]',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
    >
      {value.map((item) => {
        const label = byValue.get(item)?.label ?? item;

        return (
          <span
            key={item}
            data-slot="chips-field-chip"
            className={cn(chipClass, 'bg-(--chip-bg) text-(--chip-fg)')}
          >
            {label}
            <button
              type="button"
              aria-label={labels.remove(label)}
              disabled={disabled}
              onClick={() => remove(item)}
              className="cursor-pointer text-(--text-3) outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)"
            >
              <X aria-hidden="true" className="size-[calc(12px*var(--app-scale))]" />
            </button>
          </span>
        );
      })}

      <PickerPopover
        nodes={nodes}
        value={value}
        multiple
        onChange={(next) => onChange(Array.isArray(next) ? next : next === null ? [] : [next])}
        labels={labels}
        disabled={disabled}
        aria-label={ariaLabel}
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            type="button"
            data-slot="chips-field-add"
            id={id}
            ref={ref}
            onBlur={onBlur}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid || undefined}
            disabled={disabled}
            aria-label={labels.add}
            className={cn(
              chipClass,
              'cursor-pointer gap-[calc(5px*var(--app-scale))] border border-dashed border-(--chip-border-dashed) text-(--text-3) outline-none',
              'focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)',
            )}
          >
            <Plus aria-hidden="true" className="size-[calc(12px*var(--app-scale))]" />
            {labels.add}
          </button>
        }
      />
    </div>
  );
}
