import {
  useCallback,
  useState,
  type JSX,
  type KeyboardEvent,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ConfirmSeverity } from './ConfirmDialog';

export interface PopconfirmConfirmation {
  /** 用户必须逐字输入这个值才解锁确认键（板上是被删对象的名称） */
  expected: string;
  placeholder?: string;
}

export interface PopconfirmPanelProps {
  title: ReactNode;
  description?: ReactNode;
  cancelText: ReactNode;
  confirmText: ReactNode;
  severity?: ConfirmSeverity;
  confirmation?: PopconfirmConfirmation;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  className?: string;
}

export interface PopconfirmProps {
  /** 触发器。以 asChild 挂到 Radix Trigger 上，必须是单个可接 ref 的元素 */
  children: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  cancelText: ReactNode;
  confirmText: ReactNode;
  severity?: ConfirmSeverity;
  confirmation?: PopconfirmConfirmation;
  /** 外部驱动的 pending（调用方自己管 mutation 状态时用） */
  pending?: boolean;
  /** 返回 Promise 时自动进 pending，resolve 后关闭；reject 保持打开交调用方提示 */
  onConfirm: () => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: ComponentProps<typeof PopoverContent>['side'];
  align?: ComponentProps<typeof PopoverContent>['align'];
  /** 禁用时触发器点击不再打开气泡 */
  disabled?: boolean;
  className?: string;
}

/** onConfirm 可以返回 void 也可以返回 Promise，这里不靠 instanceof（thenable 也算） */
function isThenable(value: unknown): value is Promise<void> {
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}

const severityIcon: Record<ConfirmSeverity, typeof Info> = {
  reversible: Info,
  impact: TriangleAlert,
  irreversible: TriangleAlert,
};

const severityIconClass: Record<ConfirmSeverity, string> = {
  reversible: 'text-(--info)',
  impact: 'text-(--warning)',
  irreversible: 'text-(--danger)',
};

/** 与 ConfirmDialog 的 severityConfirmVariant 同表：可撤销走品牌色，另两档走危险色 */
const severityConfirmVariant: Record<ConfirmSeverity, ComponentProps<typeof Button>['variant']> = {
  reversible: 'primary',
  impact: 'danger',
  irreversible: 'danger',
};

/**
 * 气泡内容本体。单独导出是为了状态矩阵能把三档并排常显（不必逐个点开），
 * 也让别处需要「非浮层的确认块」时不必再抄一遍排版。
 */
export function PopconfirmPanel({
  title,
  description,
  cancelText,
  confirmText,
  severity = 'impact',
  confirmation,
  pending = false,
  onCancel,
  onConfirm,
  className,
}: PopconfirmPanelProps): JSX.Element {
  const [typedName, setTypedName] = useState('');
  const requiresConfirmation = severity === 'irreversible' && confirmation !== undefined;
  const confirmLocked = requiresConfirmation && typedName.trim() !== confirmation.expected;
  const Icon = severityIcon[severity];

  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (!confirmLocked && !pending) onConfirm();
  };

  return (
    <div
      data-slot="popconfirm-panel"
      data-severity={severity}
      className={cn('flex w-[calc(280px*var(--app-scale))] flex-col', className)}
    >
      <div className="flex gap-[calc(10px*var(--app-scale))] px-[calc(14px*var(--app-scale))] pt-[calc(12px*var(--app-scale))] pb-[calc(10px*var(--app-scale))]">
        <Icon
          aria-hidden="true"
          className={cn(
            'mt-[calc(1px*var(--app-scale))] size-[calc(15px*var(--app-scale))] shrink-0',
            severityIconClass[severity],
          )}
        />
        <div className="flex min-w-0 flex-col gap-[calc(4px*var(--app-scale))]">
          <span
            data-slot="popconfirm-title"
            className="text-[calc(13px*var(--app-scale))] font-medium text-(--overlay-fg)"
          >
            {title}
          </span>
          {description && (
            <span
              data-slot="popconfirm-description"
              className="text-[calc(12px*var(--app-scale))] leading-[1.55] text-(--overlay-muted-fg)"
            >
              {description}
            </span>
          )}
          {requiresConfirmation && (
            <Input
              inputSize="sm"
              value={typedName}
              placeholder={confirmation.placeholder}
              aria-label={confirmation.placeholder}
              autoComplete="off"
              disabled={pending}
              className="mt-[calc(6px*var(--app-scale))] w-[calc(224px*var(--app-scale))] font-mono"
              onChange={(event) => setTypedName(event.target.value)}
              onKeyDown={submitOnEnter}
            />
          )}
        </div>
      </div>

      <div className="flex justify-end gap-[calc(6px*var(--app-scale))] px-[calc(14px*var(--app-scale))] pb-[calc(12px*var(--app-scale))]">
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {cancelText}
        </Button>
        <Button
          variant={severityConfirmVariant[severity]}
          size="sm"
          loading={pending}
          disabled={confirmLocked}
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );
}

export function Popconfirm({
  children,
  title,
  description,
  cancelText,
  confirmText,
  severity = 'impact',
  confirmation,
  pending = false,
  onConfirm,
  open: openProp,
  onOpenChange,
  side = 'bottom',
  align = 'end',
  disabled = false,
  className,
}: PopconfirmProps): JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (next && disabled) return;
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [disabled, onOpenChange, openProp],
  );

  const handleConfirm = useCallback(() => {
    const result = onConfirm();
    if (!isThenable(result)) {
      setOpen(false);
      return;
    }
    setAwaiting(true);
    void result
      .then(() => {
        setOpen(false);
      })
      // reject 时不关闭：错误提示归调用方（toast / 表单），气泡留在原地让用户重试
      .catch(() => undefined)
      .finally(() => {
        setAwaiting(false);
      });
  }, [onConfirm, setOpen]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      {/* 内容随关闭卸载（Radix 默认）：不可逆档的确认词随之清空，
          不会把上一个对象的输入留下来直接放行下一个 */}
      <PopoverContent
        data-slot="popconfirm"
        side={side}
        align={align}
        className={cn('w-auto overflow-hidden p-0', className)}
      >
        <PopconfirmPanel
          title={title}
          description={description}
          cancelText={cancelText}
          confirmText={confirmText}
          severity={severity}
          confirmation={confirmation}
          pending={pending || awaiting}
          onCancel={() => setOpen(false)}
          onConfirm={handleConfirm}
        />
      </PopoverContent>
    </Popover>
  );
}
