import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageThreePane({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-testid="page-three-pane"
      className={cn(
        'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,5fr)]',
        className,
      )}
      {...props}
    />
  );
}

export function PagePane({
  variant,
  className,
  ...props
}: ComponentProps<'section'> & { variant: 'navigation' | 'master' | 'detail' }) {
  return (
    <section
      data-slot="page-pane"
      data-variant={variant}
      className={cn(
        'flex min-h-0 min-w-0 flex-col',
        (variant === 'navigation' || variant === 'master') &&
          'border-r border-(--page-pane-divider) bg-(--side-list-bg)',
        variant === 'detail' && 'bg-(--page-surface-bg)',
        className,
      )}
      {...props}
    />
  );
}

export function PagePaneHeader({
  title,
  meta,
  actions,
  ariaLabel,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div
      data-slot="page-pane-header"
      role={ariaLabel ? 'toolbar' : undefined}
      aria-label={ariaLabel}
      className="flex min-h-[calc(44px*var(--app-scale))] items-center justify-between gap-3 border-b border-(--page-section-divider) px-3 py-2"
    >
      <div data-slot="page-pane-heading" className="flex min-w-0 flex-col items-start">
        <h2 className="max-w-full truncate text-sm font-semibold text-text">{title}</h2>
        {meta ? (
          <span data-slot="page-pane-meta" className="max-w-full truncate text-xs text-text-3">
            {meta}
          </span>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PagePaneToolbar({
  variant = 'default',
  className,
  ...props
}: ComponentProps<'div'> & { variant?: 'default' | 'tabs' | 'plain' }) {
  return (
    <div
      data-slot="page-pane-toolbar"
      className={cn(
        variant !== 'plain' && 'border-b border-(--page-section-divider)',
        variant === 'default' && 'px-4 py-2.5',
        variant === 'tabs' &&
          'flex h-[calc(46px*var(--app-scale))] shrink-0 items-center px-[calc(20px*var(--app-scale))]',
        className,
      )}
      {...props}
    />
  );
}

export function PagePaneBody({
  tone = 'default',
  className,
  ...props
}: ComponentProps<'div'> & { tone?: 'default' | 'canvas' }) {
  return (
    <div
      data-slot="page-pane-body"
      data-tone={tone}
      className={cn(
        'min-h-0 flex-1 overflow-y-auto p-3',
        tone === 'canvas' && 'bg-(--pro-page-bg)',
        className,
      )}
      {...props}
    />
  );
}

export function PagePaneFooter({
  variant = 'default',
  hint,
  children,
  className,
  ...props
}: ComponentProps<'div'> & {
  variant?: 'default' | 'form';
  hint?: ReactNode;
}) {
  return (
    <div
      data-slot="page-pane-footer"
      data-variant={variant}
      className={cn(
        variant === 'default'
          ? 'border-t border-(--page-section-divider) p-3'
          : 'flex h-[calc(52px*var(--app-scale))] shrink-0 items-center gap-[calc(10px*var(--app-scale))] border-t border-(--page-action-bar-border) px-[calc(24px*var(--app-scale))]',
        className,
      )}
      {...props}
    >
      {hint !== undefined && (
        <span
          data-slot="page-footer-hint"
          className="min-w-0 flex-1 truncate text-[calc(11.5px*var(--app-scale))] text-(--page-section-description-fg)"
        >
          {hint}
        </span>
      )}
      {children}
    </div>
  );
}
