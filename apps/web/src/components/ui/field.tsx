import type { ComponentProps, ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FieldGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-3', className)} {...props} />;
}

export function Field({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="field"
      className={cn('grid content-start gap-1.5 data-[invalid=true]:text-danger', className)}
      {...props}
    />
  );
}

export function FieldLabel({
  className,
  required,
  changed,
  presentation = 'default',
  children,
  ...props
}: ComponentProps<'label'> & {
  required?: boolean;
  /** 编辑页字段相对初始值已改动：标签后出现品牌色小圆点 */
  changed?: boolean;
  presentation?: 'default' | 'form' | 'hint';
}) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        presentation === 'default'
          ? 'text-xs font-medium text-(--field-label-fg)'
          : presentation === 'form'
            ? 'text-[calc(12.5px*var(--app-scale))] font-normal text-(--field-label-fg)'
            : 'text-xs font-normal text-(--field-hint-fg)',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="ml-1 text-(--field-required-fg)">
          *
        </span>
      )}
      {changed && (
        <span
          aria-hidden="true"
          data-slot="field-changed-dot"
          className="ml-[calc(6px*var(--app-scale))] inline-block size-[calc(6px*var(--app-scale))] rounded-full bg-(--button-link-fg) align-middle"
        />
      )}
    </label>
  );
}

export function FieldDescription({
  size = 'default',
  className,
  ...props
}: ComponentProps<'p'> & { size?: 'default' | 'compact' | 'body' }) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        'text-(--field-description-fg)',
        size === 'default'
          ? 'text-xs'
          : size === 'compact'
            ? 'text-[calc(12.5px*var(--app-scale))]'
            : 'text-[calc(13px*var(--app-scale))]',
        className,
      )}
      {...props}
    />
  );
}

// 不用 tooltip——鼠标移开就看不见的提示等于没有。
export function FieldError({ className, children, ...props }: ComponentProps<'p'>) {
  if (!children) return null;

  return (
    <p
      data-slot="field-error"
      className={cn(
        'flex items-center gap-[calc(5px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-danger',
        className,
      )}
      {...props}
    >
      <CircleAlert
        aria-hidden="true"
        strokeWidth={2.2}
        className="size-[calc(11px*var(--app-scale))] shrink-0"
      />
      {children}
    </p>
  );
}

export function FieldSet({ className, ...props }: ComponentProps<'fieldset'>) {
  return <fieldset data-slot="field-set" className={cn('grid gap-3', className)} {...props} />;
}

export function FieldLegend({ className, ...props }: ComponentProps<'legend'>) {
  return (
    <legend
      data-slot="field-legend"
      className={cn('mb-1 text-sm font-semibold text-text', className)}
      {...props}
    />
  );
}

/** 表单中的只读字段值，与可编辑输入保持同一排印家族。 */
export function FieldValue({
  mono = false,
  className,
  ...props
}: ComponentProps<'span'> & { mono?: boolean }) {
  return (
    <span
      data-slot="field-value"
      className={cn(
        'text-[calc(13px*var(--app-scale))] text-(--field-value-fg)',
        mono && 'font-mono',
        className,
      )}
      {...props}
    />
  );
}

/** 表单页的必填符号说明，文案由业务按语序传入。 */
export function FieldRequiredHint({ before, after }: { before: ReactNode; after: ReactNode }) {
  return (
    <span data-slot="field-required-hint" className="text-xs text-(--field-required-hint-fg)">
      {before}
      <span className="text-(--field-required-fg)">*</span>
      {after}
    </span>
  );
}
