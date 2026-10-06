import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { PagePane, PagePaneBody, DetailHeader } from '@/components/pro/page-scaffold';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { TableText } from '@/components/pro/TableText';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { authzContext, matchPermission } from '@/lib/permission';
import { jobDetailQuery } from '../api';
import { jobError, jobTime } from '../model';
import { JobConfigForm } from '../form/JobConfigForm';
import { JobCommands } from '../components/JobCommands';
import { JobRecentRuns } from './JobRecentRuns';

export function JobDetailPanel({
  jobKey,
  permissions,
  systemAdmin,
  onClose,
  onDirtyChange,
}: {
  jobKey: string;
  permissions: string[];
  systemAdmin?: boolean;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const query = useQuery(jobDetailQuery(jobKey));
  const canUpdate = matchPermission(authzContext(permissions, systemAdmin), 'sys:job:update');
  return (
    <PagePane
      variant="detail"
      role="region"
      aria-label={t('jobs.config')}
      className="w-full shrink-0 lg:w-[calc(390px*var(--app-scale))]"
    >
      <PagePaneBody className="px-5 py-4">
        <QueryState
          data={query.data}
          pending={query.isPending}
          refreshing={query.isFetching && !query.isPending}
          error={query.isError}
          loadingLabel={t('jobs.loading')}
          errorLabel={jobError(query.error, t)}
          retryLabel={t('jobs.retry')}
          onRetry={() => void query.refetch()}
        >
          {(job) => (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2">
                <DetailHeader
                  variant="identity"
                  className="flex-1"
                  title={job.name}
                  subtitle={job.key}
                  subtitleMono
                  status={
                    <StatusBadge tone={job.enabled ? 'success' : 'neutral'}>
                      {t(job.enabled ? 'jobs.enabled' : 'jobs.disabled')}
                    </StatusBadge>
                  }
                />
                <Button size="icon-sm" variant="ghost" aria-label={t('jobs.close')} onClick={onClose}>
                  <X aria-hidden="true" />
                </Button>
              </div>
              <TableText className="whitespace-normal">{job.description}</TableText>
              <JobCommands job={job} permissions={permissions} systemAdmin={systemAdmin} />
              {job.retryAt && (
                <TableText tone="weak">
                  {t('jobs.retryAt', { time: jobTime(job.retryAt, i18n.language) })}
                </TableText>
              )}
              <Separator />
              <JobConfigForm key={jobKey} initial={job} canUpdate={canUpdate} onDirtyChange={onDirtyChange} />
              <Separator />
              <JobRecentRuns jobKey={jobKey} />
            </div>
          )}
        </QueryState>
      </PagePaneBody>
    </PagePane>
  );
}
