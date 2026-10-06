import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/pro/Pagination';

// 分页器状态矩阵（Pagination：当前页 / 上一页下一页 / 刷新中标签）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function PaginationMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="paginationMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.paginationCurrent')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step7MatrixDesc')}</p>
      </div>
      <Pagination
        page={2}
        pageCount={4}
        totalLabel={t('dev.themeStates.paginationTotal')}
        refreshingLabel={t('dev.themeStates.paginationRefreshing')}
        prevLabel={t('dev.themeStates.paginationPrev')}
        nextLabel={t('dev.themeStates.paginationNext')}
        currentLabel={t('dev.themeStates.paginationCurrent')}
        onPageChange={() => undefined}
      />
    </section>
  );
}
