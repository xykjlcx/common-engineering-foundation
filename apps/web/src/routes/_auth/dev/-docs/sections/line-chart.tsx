import { useTranslation } from 'react-i18next';
import { LineChart } from '@/components/pro/LineChart';

export default function LineChartMatrix() {
  const { t } = useTranslation('admin');
  const label = t('dashboard.overview.trend');
  const emptyLabel = t('dashboard.overview.noChanges');
  return (
    <section className="grid gap-4" data-testid="lineChartMatrix">
      <LineChart
        label={label}
        emptyLabel={emptyLabel}
        labels={['10-01', '10-02', '10-03']}
        series={[
          { label: t('dashboard.overview.successLogins'), values: [2, 5, 3] },
          { label: t('dashboard.overview.changes'), values: [1, 2, 4] },
        ]}
      />
      <LineChart
        label={label}
        emptyLabel={emptyLabel}
        labels={['10-01', '10-02', '10-03']}
        series={[{ label: t('dashboard.overview.successLogins'), values: [0, 0, 0] }]}
      />
      <LineChart label={label} emptyLabel={emptyLabel} labels={[]} series={[]} />
    </section>
  );
}
