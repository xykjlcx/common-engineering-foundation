import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageFrame, PageSection } from '@/components/pro/page-scaffold';
import { QueryState } from '@/components/pro/QueryState';
import { Button } from '@/components/ui/button';
import { formatLocalDateTime } from '@/lib/datetime';
import { sessionDevice } from '@/lib/session-device';
import { overviewQuery, dashboardKeys } from '../api';
import { DashboardMetrics } from './DashboardMetrics';
import { DashboardActivity } from './DashboardActivity';
import { DashboardActions } from './DashboardActions';
import type { DashboardPageProps } from '../types';

export function DashboardScene({ identity, onNavigate }: DashboardPageProps) {
  const { t } = useTranslation('admin');
  const client = useQueryClient();
  const overview = useQuery(overviewQuery(identity));
  const last = overview.data?.lastLogin;
  return (
    <PageFrame breadcrumbs={[{ label: t('dashboard.live.title') }]}>
      <div className="grid gap-4 p-5">
        <PageSection
          variant="plain"
          title={t('dashboard.live.welcome', { name: identity.name })}
          description={
            last
              ? t('dashboard.overview.lastLogin', {
                  detail: [formatLocalDateTime(last.at), last.ip, sessionDevice(last.ua)]
                    .filter(Boolean)
                    .join(' · '),
                })
              : undefined
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={overview.isFetching}
              onClick={() => void client.invalidateQueries({ queryKey: dashboardKeys.all })}
            >
              {t('dashboard.overview.refresh')}
            </Button>
          }
        />
        <DashboardMetrics identity={identity} />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <QueryState
            data={overview.data}
            pending={overview.isPending}
            error={overview.isError}
            loadingLabel={t('dashboard.live.loading')}
            errorLabel={t('dashboard.live.error')}
            retryLabel={t('dashboard.live.retry')}
            onRetry={() => void overview.refetch()}
          >
            {() => <DashboardActivity identity={identity} onNavigate={onNavigate} />}
          </QueryState>
          <DashboardActions identity={identity} onNavigate={onNavigate} />
        </div>
      </div>
    </PageFrame>
  );
}
