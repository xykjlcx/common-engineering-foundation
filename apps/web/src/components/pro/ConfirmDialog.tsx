import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// reversible   可撤销   —— 直接确认，主按钮走品牌色（「离开当前页面？/ 放弃修改」）
// impact       有影响面 —— 影响写进按钮文案本身（「停用并转交」），不是只写「确定」
// irreversible 不可逆   —— 强制输入名称，确认键在输入匹配前置灰
export type ConfirmSeverity = 'reversible' | 'impact' | 'irreversible';

export interface ConfirmDialogConfirmation {
  label: ReactNode;
  // 用户必须逐字输入这个值才解锁确认键（板上是被删对象的名称）
  expected: string;
  placeholder?: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** 不传则只渲染确认钮（结果告知：「密码已重置」这类没有取消语义） */
  cancelText?: ReactNode;
  confirmText: ReactNode;
  severity?: ConfirmSeverity;
  confirmation?: ConfirmDialogConfirmation;
  confirmVariant?: ComponentProps<typeof Button>['variant'];
  pending?: boolean;
  /** 消费方映射后的提交失败文案；保持弹窗和输入可重试。 */
  error?: ReactNode;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

const severityConfirmVariant: Record<ConfirmSeverity, ComponentProps<typeof Button>['variant']> = {
  reversible: 'primary',
  impact: 'danger',
  irreversible: 'danger',
};

export function ConfirmDialog({
  open,
  title,
  description,
  cancelText,
  confirmText,
  severity = 'impact',
  confirmation,
  confirmVariant,
  pending = false,
  error,
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const busy = pending || submitting;
  const handleOpenChange = (next: boolean) => {
    if (!busy && !submissionLock.current) onOpenChange(next);
  };
  const handleConfirm = async () => {
    if (busy || submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      await onConfirm();
    } catch {
      // 失败文案由消费方映射后通过 error 传入，不直接展示服务端异常。
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-severity={severity}
        aria-busy={busy}
        onOpenAutoFocus={() => {
          openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          if (openerRef.current?.isConnected) {
            event.preventDefault();
            openerRef.current.focus();
          }
        }}
        showCloseButton={!busy}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        {/* 输入态住在 DialogContent 内部：Radix 关闭时卸载内容，确认词随之清空，
            不会把上一个对象的输入留下来直接放行下一个 */}
        <ConfirmDialogBody
          title={title}
          description={description}
          cancelText={cancelText}
          confirmText={confirmText}
          severity={severity}
          confirmation={confirmation}
          confirmVariant={confirmVariant}
          pending={busy}
          error={error}
          onOpenChange={handleOpenChange}
          onConfirm={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialogBody({
  title,
  description,
  cancelText,
  confirmText,
  severity,
  confirmation,
  confirmVariant,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: Omit<ConfirmDialogProps, 'open' | 'severity'> & { severity: ConfirmSeverity }) {
  const [typedName, setTypedName] = useState('');
  const confirmationId = useId();
  const requiresConfirmation = severity === 'irreversible' && confirmation !== undefined;
  const confirmLocked = requiresConfirmation && typedName.trim() !== confirmation.expected;

  return (
    <>
      <DialogHeader>
        <DialogTitle className={cn(severity === 'irreversible' && 'text-danger')}>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      {requiresConfirmation && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={confirmationId} className="text-xs text-(--overlay-muted-fg)">
            {confirmation.label}
          </label>
          <Input
            id={confirmationId}
            disabled={pending}
            value={typedName}
            placeholder={confirmation.placeholder}
            autoComplete="off"
            onChange={(event) => setTypedName(event.target.value)}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <DialogFooter>
        {cancelText !== undefined && (
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelText}
          </Button>
        )}
        <Button
          variant={confirmVariant ?? severityConfirmVariant[severity]}
          onClick={() => void onConfirm()}
          loading={pending}
          disabled={confirmLocked}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </>
  );
}
