import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Metric } from '@/components/pro/Metric';

// 指标卡状态矩阵（Metric 正向 / 负向趋势 / 无趋势）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function MetricMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="metricMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">Metric</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step7MatrixDesc')}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric
          label={t('dev.themeStates.tableName')}
          value="12,840"
          trend={{
            label: t('dev.themeStates.paginationRefreshing'),
            value: '12%',
            direction: 'positive',
          }}
        />
        <Metric
          label={t('dev.themeStates.tableStatus')}
          value="-8"
          trend={{
            label: t('dev.themeStates.paginationRefreshing'),
            value: '8%',
            direction: 'negative',
          }}
        />
        <Metric label={t('dev.themeStates.dataTableNormal')} value="3" />
        <Metric
          tone="warning"
          label={t('dev.themeStates.tableStatus')}
          value="5"
          caption={t('dev.themeStates.paginationRefreshing')}
        />
      </div>
    </section>
  );
}
