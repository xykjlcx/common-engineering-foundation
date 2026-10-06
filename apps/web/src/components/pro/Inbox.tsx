import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface InboxCategory {
  id: string;
  label: string;
  count?: number;
}

export function InboxNavigation({
  title,
  items,
  activeId,
  onSelect,
  footer,
}: {
  title: string;
  items: InboxCategory[];
  activeId: string;
  onSelect: (id: string) => void;
  footer?: ReactNode;
}) {
  return (
    <div data-slot="inbox-navigation" className="flex h-full min-h-0 flex-col bg-(--pro-panel-bg)">
      <h1 className="px-[calc(18px*var(--app-scale))] pt-[calc(18px*var(--app-scale))] pb-[calc(12px*var(--app-scale))] text-[calc(18px*var(--app-scale))] font-semibold text-(--table-row-fg)">
        {title}
      </h1>
      <nav className="px-3" aria-label={title}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-current={item.id === activeId ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
            className={cn(
              'mb-px flex h-[calc(33px*var(--app-scale))] w-full cursor-pointer items-center gap-2 rounded-4 px-3 text-left text-sm outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)',
              item.id === activeId
                ? 'bg-(--table-header-bg) font-semibold text-(--table-row-fg)'
                : 'text-(--button-secondary-fg) hover:bg-(--side-list-item-bg-hover)',
            )}
          >
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {!!item.count && (
              <span
                data-slot="inbox-count"
                className="flex h-[calc(18px*var(--app-scale))] min-w-[calc(18px*var(--app-scale))] items-center justify-center rounded-full bg-(--button-primary-bg) px-1 text-xs font-semibold text-(--button-primary-fg)"
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="flex-1" />
      {footer && <div className="grid gap-2 p-3">{footer}</div>}
    </div>
  );
}

export interface InboxItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon?: ReactNode;
  tone?: 'neutral' | 'info' | 'warning' | 'danger';
  unread: boolean;
  meta?: ReactNode;
}

const iconTone = {
  neutral: 'bg-(--badge-neutral-bg) text-(--badge-neutral-fg)',
  info: 'bg-(--badge-info-bg) text-(--badge-info-fg)',
  warning: 'bg-(--badge-warning-bg) text-(--badge-warning-fg)',
  danger: 'bg-(--badge-danger-bg) text-(--badge-danger-fg)',
};

export function InboxList({
  label,
  items,
  activeId,
  onSelect,
  loading,
  error,
  emptyLabel,
  errorLabel,
  retryLabel,
  onRetry,
}: {
  label: string;
  items: InboxItem[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: boolean;
  emptyLabel: string;
  errorLabel: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      data-slot="inbox-list"
      className="min-h-0 flex-1 overflow-y-auto bg-(--pro-panel-bg)"
      aria-label={label}
      aria-busy={loading}
    >
      {loading ? (
        <div className="grid gap-4 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="grid justify-items-center gap-3 p-6 text-sm text-(--table-header-fg)">
          <span>{errorLabel}</span>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-full min-h-36 items-center justify-center p-6 text-sm text-(--table-header-fg)">
          {emptyLabel}
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.title}
            aria-current={item.id === activeId ? 'true' : undefined}
            data-state={item.id === activeId ? 'selected' : undefined}
            onClick={() => onSelect(item.id)}
            className={cn(
              'relative flex min-h-[calc(63px*var(--app-scale))] w-full cursor-pointer items-center gap-[calc(10px*var(--app-scale))] border-b border-(--page-section-divider) px-[calc(16px*var(--app-scale))] py-2 text-left outline-none focus-visible:ring-inset focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)',
              item.id === activeId
                ? 'bg-(--table-row-bg-selected) before:absolute before:inset-y-0 before:left-0 before:w-[calc(2px*var(--app-scale))] before:bg-(--button-primary-bg)'
                : 'hover:bg-(--table-row-bg-hover)',
            )}
          >
            <span className="flex w-[calc(8px*var(--app-scale))] shrink-0 justify-center">
              {item.unread && (
                <span
                  data-slot="inbox-unread"
                  className="size-[calc(7px*var(--app-scale))] rounded-full bg-(--button-primary-bg)"
                />
              )}
            </span>
            <span
              data-slot="inbox-icon"
              className={cn(
                'flex size-[calc(30px*var(--app-scale))] shrink-0 items-center justify-center rounded-full [&>svg]:size-[calc(14px*var(--app-scale))]',
                iconTone[item.tone ?? 'neutral'],
              )}
            >
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm text-(--table-row-fg)',
                    item.unread && 'font-semibold',
                  )}
                >
                  {item.title}
                </span>
                {item.meta}
              </span>
              <span className="mt-1 block truncate text-sm text-(--table-cell-hint-fg)">
                {item.description}
              </span>
            </span>
            <span className="self-start pt-1 font-mono text-[calc(11.5px*var(--app-scale))] text-(--table-cell-hint-fg)">
              {item.time}
            </span>
          </button>
        ))
      )}
    </div>
  );
}

export function InboxDetailHeading({
  title,
  meta,
  kind,
  actions,
  children,
}: {
  title: string;
  meta: string;
  kind?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      data-slot="inbox-detail-heading"
      className="px-[calc(36px*var(--app-scale))] pt-[calc(24px*var(--app-scale))] pb-[calc(20px*var(--app-scale))]"
    >
      <div className="mb-[calc(20px*var(--app-scale))] flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {kind}
          <span className="text-xs text-(--table-cell-hint-fg)">{meta}</span>
        </div>
        {actions}
      </div>
      <h2 className="mb-[calc(18px*var(--app-scale))] break-words text-[calc(20px*var(--app-scale))] font-semibold text-(--table-row-fg)">
        {title}
      </h2>
      {children}
    </div>
  );
}
