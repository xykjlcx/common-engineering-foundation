import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { TableText } from '@/components/pro/TableText';
import { Button } from '@/components/ui/button';
import { jobLogsQuery } from '../api';
import { jobError, jobTime } from '../model';
import { JobLogsDialog } from './JobLogsDialog';
export function JobRecentRuns({ jobKey }: { jobKey: string }) {
  const { t, i18n } = useTranslation('admin');
  const query = useQuery(jobLogsQuery({ key: jobKey, page: 1, pageSize: 3 }));
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <TableText tone="strong">{t('jobs.recent')}</TableText>
        <Button size="sm" variant="link" onClick={() => setOpen(true)}>
          {t('jobs.allLogs')}
        </Button>
      </div>
      <QueryState
        data={query.data}
        pending={query.isPending}
        error={query.isError}
        loadingLabel={t('jobs.loading')}
        errorLabel={jobError(query.error, t)}
        retryLabel={t('jobs.retry')}
        onRetry={() => void query.refetch()}
        skeletonRows={3}
      >
        {(data) => (
          <div className="flex flex-col gap-3">
            {data.list.length ? (
              data.list.map((run) => (
                <div key={run.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={run.status === 'success' ? 'success' : 'danger'}>
                      {t(`jobs.status.${run.status}`)}
                    </StatusBadge>
                    <TableText mono>{jobTime(run.startedAt, i18n.language)}</TableText>
                    <TableText className="ml-auto" tone="weak">
                      {t('jobs.duration', { ms: run.durationMs })}
                    </TableText>
                  </div>
                  <TableText className="whitespace-normal break-words">{run.message}</TableText>
                </div>
              ))
            ) : (
              <TableText>{t('jobs.noLogs')}</TableText>
            )}
          </div>
        )}
      </QueryState>
      {open && <JobLogsDialog jobKey={jobKey} onClose={() => setOpen(false)} />}
    </div>
  );
}
