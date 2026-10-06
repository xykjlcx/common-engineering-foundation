import type { DashboardPageProps } from '../types';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Metric } from '@/components/pro/Metric';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { formatLocalDateTime } from '@/lib/datetime';
import { healthQuery, overviewQuery } from '../api';

export function DashboardMetrics({ identity }: Pick<DashboardPageProps, 'identity'>) {
  const { t } = useTranslation('admin');
  const { data } = useQuery(overviewQuery(identity));
  const health = useQuery(healthQuery);
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
      {data?.sessions && (
        <Metric
          label={t('dashboard.overview.sessions')}
          value={data.sessions.count}
          caption={t('dashboard.overview.accounts', { count: data.sessions.users })}
        />
      )}
      {data?.loginsToday && (
        <Metric
          label={t('dashboard.overview.logins')}
          value={data.loginsToday.success}
          caption={t('dashboard.overview.failures', { count: data.loginsToday.failure })}
        />
      )}
      {data?.attention && (
        <Metric
          tone="warning"
          label={t('dashboard.overview.attention')}
          value={Object.values(data.attention).reduce((sum, value) => sum + (value ?? 0), 0)}
          caption={t('dashboard.overview.seeList')}
        />
      )}
      <Metric
        label={t('dashboard.overview.health')}
        value={
          <StatusBadge
            tone={health.isPending ? 'neutral' : health.isError || !health.data?.ok ? 'danger' : 'success'}
          >
            {t(
              `dashboard.overview.${health.isPending ? 'checking' : health.isError || !health.data?.ok ? 'unhealthy' : 'healthy'}`,
            )}
          </StatusBadge>
        }
        caption={
          health.data
            ? t('dashboard.overview.checkedAt', {
                time: formatLocalDateTime(health.data.now, { seconds: true }),
              })
            : '—'
        }
      />
    </div>
  );
}
