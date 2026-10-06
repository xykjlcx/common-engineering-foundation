import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const dialogSizeClass = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  list: 'sm:max-w-[calc(560px*var(--app-scale))]',
  lg: 'sm:max-w-[calc(640px*var(--app-scale))]',
};

export interface FormDialogContentProps {
  title: ReactNode;
  description?: string;
  error?: ReactNode;
  size?: keyof typeof dialogSizeClass;
  children: ReactNode;
  cancelText: ReactNode;
  submitText: ReactNode;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  targets?: { summary: ReactNode; items: readonly { id: string; label: ReactNode }[] };
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
}

export function FormDialogContent({
  title,
  description,
  error,
  size = 'md',
  children,
  cancelText,
  submitText,
  submitDisabled,
  submitLoading,
  targets,
  onCancel,
  onSubmit,
}: FormDialogContentProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const submissionLock = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const busy = submitting || submitLoading;

  useEffect(() => {
    if (error && !busy) errorRef.current?.focus();
  }, [error, busy]);

  const submit = async () => {
    if (submissionLock.current || busy || submitDisabled) return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      await onSubmit();
    } catch {
      // 消费方映射错误，通过 error 展示；输入和弹窗保持可重试。
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <DialogContent
      {...(description ? {} : { 'aria-describedby': undefined })}
      data-size={size}
      aria-busy={busy || undefined}
      className={cn(dialogSizeClass[size])}
      showCloseButton={!busy}
      onOpenAutoFocus={() => {
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }}
      onCloseAutoFocus={(event) => {
        if (openerRef.current?.isConnected) {
          event.preventDefault();
          openerRef.current.focus();
        }
      }}
      onEscapeKeyDown={(event) => {
        if (busy || submissionLock.current) event.preventDefault();
      }}
      onInteractOutside={(event) => {
        if (busy || submissionLock.current) event.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="grid gap-4"
      >
        <FieldGroup>
          {error ? (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-8 bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {error}
            </div>
          ) : null}
          <fieldset disabled={busy} className="grid min-w-0 gap-4">
            {children}
          </fieldset>
        </FieldGroup>
        {targets && showTargets && (
          <ul
            data-slot="form-dialog-targets"
            className="m-0 grid max-h-40 list-none gap-1 overflow-y-auto rounded-6 bg-(--surface-2) p-3 text-sm text-(--overlay-muted-fg)"
          >
            {targets.items.map((target) => (
              <li key={target.id}>{target.label}</li>
            ))}
          </ul>
        )}
        <DialogFooter>
          {targets && (
            <button
              type="button"
              data-slot="form-dialog-targets-toggle"
              aria-expanded={showTargets}
              onClick={() => setShowTargets((open) => !open)}
              className="mr-auto cursor-pointer self-center bg-transparent p-0 text-xs text-(--overlay-muted-fg) outline-none hover:underline focus-visible:underline"
            >
              {targets.summary}
            </button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (!submissionLock.current && !busy) onCancel();
            }}
          >
            {cancelText}
          </Button>
          <Button type="submit" disabled={submitDisabled || busy} loading={busy}>
            {submitText}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
