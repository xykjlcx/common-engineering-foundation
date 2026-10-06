import { Fragment, type ComponentProps, type ReactNode } from 'react';
import { AnimatedTabs } from '@/components/pro/AnimatedTabs';
import { cn } from '@/lib/utils';

export function PageSection({
  title,
  description,
  leading,
  actions,
  variant = 'subtle',
  children,
  className,
  ...props
}: Omit<ComponentProps<'section'>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  variant?: 'subtle' | 'card' | 'plain';
}) {
  return (
    <section
      data-slot="page-section"
      data-variant={variant}
      className={cn(
        'rounded-10 p-3',
        variant === 'subtle' && 'bg-(--pro-page-bg)',
        variant === 'card' && 'border border-(--page-section-divider) bg-(--pro-panel-bg) shadow-card-sm',
        variant === 'plain' && 'rounded-none bg-transparent p-0',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {leading ? (
            <span
              data-slot="page-section-leading"
              className="flex size-8 shrink-0 items-center justify-center rounded-10 bg-(--accent-emphasis-soft) text-(--accent-emphasis)"
            >
              {leading}
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-text">{title}</h3>
            {description ? <p className="mt-1 truncate text-xs text-(--type-3-fg)">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export interface PageTabItem<TValue extends string> {
  value: TValue;
  label: ReactNode;
}

export function PageTabs<TValue extends string>({
  value,
  items,
  onValueChange,
  ariaLabel,
  trailing,
}: {
  value: TValue;
  items: PageTabItem<TValue>[];
  onValueChange: (value: TValue) => void;
  ariaLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <AnimatedTabs
      value={value}
      items={items}
      onValueChange={onValueChange}
      variant="page"
      ariaLabel={ariaLabel}
      trailing={trailing}
    />
  );
}

/** 同一页面内的分区标题、说明和右侧操作。 */
export function PageSectionHeading({
  title,
  description,
  actions,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      data-slot="page-section-heading"
      className={cn('flex items-baseline gap-[calc(9px*var(--app-scale))]', className)}
      {...props}
    >
      <h2 className="text-[calc(14px*var(--app-scale))] font-semibold text-(--page-section-title-fg)">
        {title}
      </h2>
      {description !== undefined && (
        <p className="min-w-0 truncate text-[calc(12px*var(--app-scale))] text-(--page-section-description-fg)">
          {description}
        </p>
      )}
      {actions !== undefined && <div className="ml-auto flex shrink-0 items-center">{actions}</div>}
    </div>
  );
}

export function PageDivider({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-divider"
      aria-hidden="true"
      className={cn('h-px shrink-0 bg-(--page-section-hairline)', className)}
      {...props}
    />
  );
}

/** 卡片内的层级路径；当前项不可交互，右侧保留导航或表单提示。 */
export function PageBreadcrumb({
  items,
  current,
  icon,
  trailing,
  bordered = true,
  className,
  ...props
}: Omit<ComponentProps<'nav'>, 'children'> & {
  items: readonly string[];
  current: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  /** false：不画底部分隔线（与下方内容合成一块时使用） */
  bordered?: boolean;
}) {
  return (
    <nav
      data-slot="page-card-breadcrumb"
      className={cn(
        'flex h-(--rail-crumb-h) shrink-0 items-center gap-[calc(9px*var(--app-scale))] px-[calc(24px*var(--app-scale))]',
        bordered && 'border-b border-(--table-row-border)',
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="inline-flex shrink-0 text-(--page-breadcrumb-muted-fg) [&_svg]:size-[calc(15px*var(--app-scale))]"
        >
          {icon}
        </span>
      )}
      {items.map((item, index) => (
        <Fragment key={index}>
          {(icon || index > 0) && <PageBreadcrumbSeparator />}
          <span className="text-[calc(13.5px*var(--app-scale))] text-(--page-breadcrumb-muted-fg)">
            {item}
          </span>
        </Fragment>
      ))}
      {(icon || items.length > 0) && <PageBreadcrumbSeparator />}
      <span
        aria-current="page"
        className="min-w-0 truncate text-[calc(13.5px*var(--app-scale))] font-medium text-(--page-breadcrumb-current-fg)"
      >
        {current}
      </span>
      {trailing !== undefined && (
        <div className="ml-auto flex shrink-0 items-center gap-[calc(9px*var(--app-scale))]">{trailing}</div>
      )}
    </nav>
  );
}
function PageBreadcrumbSeparator() {
  return (
    <span aria-hidden="true" className="text-[calc(13px*var(--app-scale))] text-(--rail-crumb-sep-fg)">
      /
    </span>
  );
}
