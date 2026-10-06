import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex h-[calc(32px*var(--app-scale))] items-center border-b border-(--table-row-border)"
        >
          <Skeleton className="h-[calc(10px*var(--app-scale))] w-[44%] rounded-4" />
        </div>
      ))}
    </div>
  );
}

export function QueryState<T>({
  data,
  pending,
  refreshing = false,
  error,
  loadingLabel,
  errorLabel,
  retryLabel,
  onRetry,
  skeleton,
  skeletonRows = 6,
  className,
  children,
}: {
  data: T | undefined;
  pending: boolean;
  /** 已有内容的后台刷新或失败重试中。 */
  refreshing?: boolean;
  error: boolean;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
  onRetry: () => void;
  // 表格类调用方传入与真实列宽一致的骨架，避免加载完跳版
  skeleton?: ReactNode;
  skeletonRows?: number;
  className?: string;
  children: (data: T) => ReactNode;
}) {
  if (error && data === undefined) {
    return (
      <div
        role="alert"
        data-slot="query-state"
        data-state="error"
        aria-busy={refreshing}
        className={cn(
          'flex min-h-[calc(240px*var(--app-scale))] flex-col items-center justify-center gap-3 text-center',
          className,
        )}
      >
        <CircleAlert aria-hidden="true" className="size-8 text-danger" />
        <p className="text-sm text-(--type-2-fg)">{errorLabel}</p>
        <Button variant="outline" size="sm" onClick={onRetry} loading={refreshing}>
          {retryLabel}
        </Button>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div
        role="status"
        aria-label={loadingLabel}
        data-slot="query-state"
        data-state="loading"
        className={cn('min-h-[calc(240px*var(--app-scale))]', className)}
      >
        {skeleton ?? <SkeletonRows rows={skeletonRows} />}
        <span className="sr-only">{loadingLabel}</span>
      </div>
    );
  }

  return (
    <div
      data-slot="query-state"
      data-state={error ? 'refresh-error' : 'ready'}
      aria-busy={refreshing || pending}
      className={className}
    >
      {error && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-3 rounded-8 border border-(--table-border) bg-(--pro-panel-bg) p-3"
        >
          <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-danger" />
          <p className="flex-1 text-sm text-(--type-2-fg)">{errorLabel}</p>
          <Button variant="outline" size="sm" onClick={onRetry} loading={refreshing || pending}>
            {retryLabel}
          </Button>
        </div>
      )}
      {(refreshing || pending) && (
        <span role="status" className="sr-only">
          {loadingLabel}
        </span>
      )}
      <div data-slot="query-state-content">{children(data)}</div>
    </div>
  );
}
