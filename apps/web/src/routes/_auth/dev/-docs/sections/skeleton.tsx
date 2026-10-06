import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryState } from '@/components/pro/QueryState';

// 骨架屏状态矩阵：裸 Skeleton 条 + QueryState 的骨架行兜底。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function SkeletonMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="skeletonMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.skeletonMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.skeletonRowsNote')}</p>
      </div>
      <div className="grid gap-4">
        <div
          data-testid="skeletonPreview"
          className="grid gap-3 rounded-md border border-border bg-surface p-4"
        >
          <Skeleton className="h-[calc(18px*var(--app-scale))] w-2/5" />
          <Skeleton className="h-[calc(14px*var(--app-scale))] w-full" />
          <Skeleton className="h-[calc(14px*var(--app-scale))] w-4/5" />
        </div>

        <div data-testid="skeletonRowsMatrix" className="rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.skeletonRowsMatrix')}</p>
          <p className="mb-3 text-xs text-text-3">{t('dev.themeStates.skeletonRowsNote')}</p>
          <div className="rounded-md border border-border bg-surface p-4">
            <QueryState<string>
              data={undefined}
              pending
              error={false}
              loadingLabel={t('dev.themeStates.skeletonRowsLoading')}
              errorLabel={t('dev.themeStates.skeletonRowsError')}
              retryLabel={t('dev.themeStates.skeletonRowsRetry')}
              onRetry={() => undefined}
            >
              {(value) => value}
            </QueryState>
          </div>
        </div>
      </div>
    </section>
  );
}
