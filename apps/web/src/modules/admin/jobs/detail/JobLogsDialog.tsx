import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DataTable } from '@/components/pro/DataTable';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { TableText } from '@/components/pro/TableText';
import { jobLogsQuery, type JobRunDto } from '../api';
import { jobError, jobTime } from '../model';
export function JobLogsDialog({ jobKey, onClose }: { jobKey?: string; onClose: () => void }) {
  const { t, i18n } = useTranslation('admin');
  const [page, setPage] = useState(1);
  const query = useQuery(jobLogsQuery({ key: jobKey, page, pageSize: 20 }));
  const columns = useMemo<ColumnDef<JobRunDto>[]>(
    () => [
      {
        id: 'startedAt',
        header: t('jobs.columns.startedAt'),
        size: 170,
        cell: ({ row }) => <TableText mono>{jobTime(row.original.startedAt, i18n.language)}</TableText>,
      },
      {
        id: 'jobKey',
        header: t('jobs.columns.job'),
        size: 210,
        cell: ({ row }) => (
          <TableText mono title={row.original.jobKey}>
            {row.original.jobKey}
          </TableText>
        ),
      },
      {
        id: 'status',
        header: t('jobs.columns.result'),
        size: 90,
        cell: ({ row }) => (
          <StatusBadge tone={row.original.status === 'success' ? 'success' : 'danger'}>
            {t(`jobs.status.${row.original.status}`)}
          </StatusBadge>
        ),
      },
      {
        id: 'trigger',
        header: t('jobs.columns.trigger'),
        size: 100,
        cell: ({ row }) => <TableText>{t(`jobs.triggers.${row.original.trigger}`)}</TableText>,
      },
      {
        id: 'attempt',
        header: t('jobs.columns.attempt'),
        size: 80,
        cell: ({ row }) => <TableText>{row.original.attempt}</TableText>,
      },
      {
        id: 'durationMs',
        header: t('jobs.columns.duration'),
        size: 100,
        cell: ({ row }) => <TableText mono>{t('jobs.duration', { ms: row.original.durationMs })}</TableText>,
      },
      {
        id: 'message',
        header: t('jobs.columns.message'),
        size: 330,
        cell: ({ row }) => (
          <TableText className="whitespace-normal break-words" title={row.original.message}>
            {row.original.message}
          </TableText>
        ),
      },
    ],
    [t, i18n.language],
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-[90vw] max-w-[90vw] flex-col">
        <DialogHeader>
          <DialogTitle>{t('jobs.logs')}</DialogTitle>
          <DialogDescription>
            {jobKey ?? t('jobs.allTasks')} · {t('jobs.timezone')}
          </DialogDescription>
        </DialogHeader>
        <DataTable
          columns={columns}
          data={query.data?.list ?? []}
          rowKey={(run) => run.id}
          loading={query.isPending}
          busy={query.isFetching && !query.isPending}
          error={query.isError}
          errorText={jobError(query.error, t)}
          retryText={t('jobs.retry')}
          onRetry={() => void query.refetch()}
          emptyText={t('jobs.noLogs')}
          loadingText={t('jobs.loading')}
          pagination={{
            page,
            pageCount: Math.max(1, Math.ceil((query.data?.total ?? 0) / 20)),
            total: query.data?.total ?? 0,
            totalLabel: t('jobs.logCount', { count: query.data?.total ?? 0 }),
            prevLabel: t('jobs.prev'),
            nextLabel: t('jobs.next'),
            currentLabel: t('jobs.currentPage', { page }),
            onPageChange: (next) => setPage(next),
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
