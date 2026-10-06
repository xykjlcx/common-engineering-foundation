import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
  type Ref,
  type FocusEventHandler,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  PickerPanel,
  type PickerNode,
  type PickerPopoverLabels,
  type PickerSelectionProps,
} from './PickerPanel';

export type { PickerNode, PickerPopoverLabels, PickerPanelProps, PickerSelectionProps } from './PickerPanel';
export { PickerPanel } from './PickerPanel';

interface PickerPopoverBaseProps {
  id?: string;
  ref?: Ref<HTMLButtonElement>;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  'aria-describedby'?: string;
  nodes: PickerNode[];
  recent?: string[];
  onCreate?: (query: string) => void;
  labels: PickerPopoverLabels;
  size?: 'form' | 'toolbar';
  placeholder?: string;
  disabled?: boolean;
  'aria-label': string;
  'aria-invalid'?: boolean;
  className?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultQuery?: string;
  query?: string;
  onQueryChange?: (query: string) => void;
  searchMode?: 'local' | 'remote';
  busy?: boolean;
  footer?: ReactNode;
}

export type PickerPopoverProps = PickerPopoverBaseProps & PickerSelectionProps;

function toArray(value: string | readonly string[] | null): readonly string[] {
  return typeof value === 'string' ? [value] : (value ?? []);
}

export function PickerPopover(props: PickerPopoverProps): JSX.Element {
  const {
    id,
    ref,
    onBlur,
    'aria-describedby': ariaDescribedBy,
    nodes,
    value,
    recent,
    onCreate,
    labels,
    size = 'form',
    placeholder,
    disabled = false,
    className,
    trigger,
    open: openProp,
    onOpenChange,
    defaultQuery = '',
    'aria-label': ariaLabel,
    'aria-invalid': ariaInvalid,
  } = props;
  const selection: PickerSelectionProps = props.multiple
    ? { multiple: true, value: props.value, onChange: props.onChange }
    : { multiple: false, value: props.value, onChange: props.onChange };
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const inputHostRef = useRef<HTMLDivElement>(null);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, openProp],
  );

  const selected = useMemo(() => toArray(value), [value]);
  const byValue = useMemo(() => new Map(nodes.map((node) => [node.value, node])), [nodes]);
  const triggerLabel = useMemo(() => {
    if (selected.length === 0) return null;
    const [first, ...rest] = selected;
    const firstLabel = first ? (byValue.get(first)?.label ?? first) : '';
    if (rest.length === 0) return firstLabel;
    return `${firstLabel}${labels.more ? ` ${labels.more(rest.length)}` : ''}`;
  }, [byValue, labels, selected]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild id={id} ref={ref} onBlur={onBlur} aria-describedby={ariaDescribedBy}>
        {trigger ?? (
          <button
            type="button"
            data-slot="picker-trigger"
            data-size={size}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid || undefined}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={cn(
              'ui-field flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-(--field-px) text-left text-sm outline-none transition-[border-color,box-shadow,background,color]',
              size === 'form' && 'h-[var(--control-md)]',
              size === 'toolbar' && 'h-[var(--control-btn-md)]',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
          >
            <span
              className={cn('truncate', triggerLabel ? 'text-(--field-fg)' : 'text-(--field-placeholder)')}
            >
              {triggerLabel ?? placeholder}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-[calc(14px*var(--app-scale))] shrink-0 text-(--field-icon)"
            />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        data-slot="picker-popover"
        className="w-[calc(420px*var(--app-scale))] p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputHostRef.current?.querySelector('input')?.focus();
        }}
      >
        <div ref={inputHostRef}>
          <PickerPanel
            nodes={nodes}
            {...selection}
            recent={recent}
            onCreate={onCreate}
            labels={labels}
            defaultQuery={defaultQuery}
            query={props.query}
            onQueryChange={props.onQueryChange}
            searchMode={props.searchMode}
            busy={props.busy}
            footer={props.footer}
            aria-label={ariaLabel}
            onClose={() => setOpen(false)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
