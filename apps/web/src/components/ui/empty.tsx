import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// 「首次无数据」引导去新建、「筛选无结果」引导放宽条件、「无数据权限」说清当前范围，
// 混用是最常见的错误，所以把类型摆进 API，而不是靠调用方自觉挑图标。
export type EmptyVariant = 'firstUse' | 'noResult' | 'noPermission';

export interface EmptyProps {
  // 不传 variant 时不渲染默认插画（保持既有调用方的纯文字空态不变）
  variant?: EmptyVariant;
  // 显式传入的图标优先于 variant 默认插画
  icon?: ReactNode;
  iconSize?: 'default' | 'compact';
  iconTone?: 'default' | 'accent';
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

// stroke 走 currentColor + text-(--empty-icon-fg)：presentation attribute 不解析 CSS 变量（DSFoundations 1.7）。
function EmptyIllustration({ variant }: { variant: EmptyVariant }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-slot="empty-illustration"
      data-variant={variant}
      className="size-[calc(64px*var(--app-scale))] text-(--empty-icon-fg)"
    >
      {variant === 'firstUse' && (
        <>
          <rect x="10" y="18" width="44" height="34" rx="3" />
          <path d="M10 28h44" />
          <path d="M22 18v34" />
          <path d="M20 8h24l4 6" />
        </>
      )}
      {variant === 'noResult' && (
        <>
          <path d="M8 12h48l-19 22v18l-10 5V34Z" />
          <circle cx="46" cy="44" r="11" />
          <path d="m54 52 6 6" />
        </>
      )}
      {variant === 'noPermission' && (
        <>
          <rect x="14" y="28" width="36" height="26" rx="4" />
          <path d="M22 28v-8a10 10 0 0 1 20 0v8" />
          <circle cx="32" cy="41" r="3" />
        </>
      )}
    </svg>
  );
}

function Empty({
  variant,
  icon,
  iconSize = 'default',
  iconTone = 'default',
  title,
  description,
  action,
  className,
}: EmptyProps) {
  const media = icon ?? (variant ? <EmptyIllustration variant={variant} /> : null);

  return (
    <div
      data-slot="empty"
      data-variant={variant}
      className={cn(
        'flex min-h-[calc(144px*var(--app-scale))] flex-col items-center justify-center px-[calc(30px*var(--app-scale))] text-center',
        className,
      )}
    >
      {media && (
        <div
          data-slot="empty-media"
          className={cn(
            iconTone === 'accent' ? 'text-(--empty-icon-accent)' : 'text-(--empty-icon-fg)',
            iconSize === 'compact' && '[&_svg]:size-[calc(36px*var(--app-scale))]',
          )}
        >
          {media}
        </div>
      )}
      <div
        className={cn(
          'text-[calc(13.5px*var(--app-scale))] font-medium text-text',
          media && 'mt-[calc(14px*var(--app-scale))]',
        )}
      >
        {title}
      </div>
      {description && (
        <div className="mt-[calc(6px*var(--app-scale))] max-w-[calc(360px*var(--app-scale))] text-xs leading-[1.6] text-(--empty-desc-fg)">
          {description}
        </div>
      )}
      {action && <div className="mt-[calc(14px*var(--app-scale))] flex items-center gap-2">{action}</div>}
    </div>
  );
}

export { Empty };
