import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DetailHeader({
  title,
  subtitle,
  status,
  actions,
  avatar,
  variant = 'card',
  subtitleMono = false,
  className,
  ...props
}: Omit<ComponentProps<'header'>, 'title'> & {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  avatar?: ReactNode;
  variant?: 'card' | 'identity';
  subtitleMono?: boolean;
}) {
  return (
    <header
      data-slot="detail-header"
      data-variant={variant}
      className={cn(
        variant === 'card'
          ? 'mb-3 flex min-h-[calc(56px*var(--app-scale))] flex-wrap items-center gap-3 rounded-(--card-radius) border border-(--page-section-divider) bg-(--pro-panel-bg) px-[calc(14px*var(--app-scale))] py-[calc(10px*var(--app-scale))] shadow-(--page-surface-shadow)'
          : 'flex min-w-0 items-center gap-[calc(14px*var(--app-scale))]',
        className,
      )}
      {...props}
    >
      {avatar}
      <div className="min-w-0">
        <div className={cn('flex min-w-0 items-center gap-2', variant === 'card' && 'flex-wrap')}>
          <h1
            className={cn(
              'min-w-0 truncate font-semibold',
              variant === 'card'
                ? 'ui-page-title text-lg text-text'
                : 'text-[calc(15px*var(--app-scale))] text-(--page-identity-title-fg)',
            )}
          >
            {title}
          </h1>
          {status}
        </div>
        {subtitle ? (
          <p
            className={cn(
              'truncate',
              variant === 'card'
                ? 'mt-0.5 text-xs text-(--type-3-fg)'
                : 'mt-[calc(3px*var(--app-scale))] text-[calc(12px*var(--app-scale))] text-(--page-identity-subtitle-fg)',
              subtitleMono && 'font-mono',
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          data-slot="detail-header-actions"
          className="ml-auto flex flex-wrap items-center justify-end gap-2"
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function DetailWorkspace({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="detail-workspace"
      className={cn(
        'grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_var(--detail-aside-w)]',
        className,
      )}
      {...props}
    />
  );
}

export function DetailMain({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="detail-main" className={cn('grid min-w-0 content-start gap-3', className)} {...props} />
  );
}

export function DetailAside({
  variant = 'floating',
  className,
  ...props
}: ComponentProps<'aside'> & { variant?: 'floating' | 'panel' | 'side' }) {
  return (
    <aside
      data-slot="detail-aside"
      className={cn(
        variant === 'floating'
          ? 'grid min-w-0 content-start gap-3 xl:sticky xl:top-[calc(var(--shell-header-h)+var(--page-frame-py))]'
          : variant === 'side'
            ? 'min-w-0 shrink-0 overflow-y-auto border-l border-(--page-section-hairline) bg-(--pro-page-bg)'
            : 'min-w-0 shrink-0 overflow-y-auto border-r border-(--page-section-hairline)',
        className,
      )}
      {...props}
    />
  );
}

export function DetailSection({
  title,
  description,
  actions,
  toolbar,
  fill = false,
  children,
  className,
  bodyClassName,
  ...props
}: Omit<ComponentProps<'section'>, 'title'> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** 标题行下方（无标题时即顶部）的筛选条；与正文以同一条分隔线隔开 */
  toolbar?: ReactNode;
  /** 撑满父级剩余高度：正文成为 flex 列，内部表格自己滚动、分页器常驻底部 */
  fill?: boolean;
  bodyClassName?: string;
}) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <section
      data-slot="detail-section"
      className={cn(
        'min-w-0 overflow-hidden rounded-(--card-radius) border border-(--page-section-divider) bg-(--pro-panel-bg)',
        fill && 'flex min-h-0 flex-1 flex-col',
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <div
          data-slot="detail-section-header"
          className="flex min-h-[calc(36px*var(--app-scale))] shrink-0 items-center gap-3 border-b border-(--page-section-divider) px-[calc(14px*var(--app-scale))] py-[calc(6px*var(--app-scale))]"
        >
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="shrink-0 text-sm text-text">{title}</h2>
            {description ? <p className="truncate text-xs text-(--type-3-fg)">{description}</p> : null}
          </div>
          {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {toolbar ? (
        <div
          data-slot="detail-section-toolbar"
          className="flex shrink-0 flex-wrap items-center gap-2 border-b border-(--page-section-divider) px-[calc(14px*var(--app-scale))] py-[calc(8px*var(--app-scale))]"
        >
          {toolbar}
        </div>
      ) : null}
      <div
        data-slot="detail-section-body"
        className={cn(
          'p-[calc(10px*var(--app-scale))] px-[calc(14px*var(--app-scale))]',
          fill && 'flex min-h-0 flex-1 flex-col',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export interface DetailTimelineItem {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  state?: 'complete' | 'current' | 'pending';
}

export function DetailTimeline({ items, className }: { items: DetailTimelineItem[]; className?: string }) {
  return (
    <ol data-slot="detail-timeline" className={cn('grid gap-3', className)}>
      {items.map((item) => (
        <li
          key={item.id}
          data-slot="detail-timeline-item"
          data-state={item.state ?? 'pending'}
          className="grid grid-cols-[calc(12px*var(--app-scale))_minmax(0,1fr)] gap-2.5"
        >
          <span
            aria-hidden="true"
            data-state={item.state ?? 'pending'}
            className="mt-1 size-2.5 rounded-full border border-(--pro-timeline-marker-border) bg-(--pro-timeline-marker-bg) data-[state=complete]:border-(--pro-timeline-marker-active) data-[state=complete]:bg-(--pro-timeline-marker-active) data-[state=current]:border-(--pro-timeline-marker-active) data-[state=current]:bg-(--pro-timeline-marker-active)"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">{item.title}</p>
            {item.meta ? <p className="mt-0.5 text-xs text-(--type-3-fg)">{item.meta}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
