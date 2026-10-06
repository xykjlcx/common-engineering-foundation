import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import type { JobDto } from '../api';
import { jobTime } from '../model';
export function jobColumns(
  t: TFunction<'admin'>,
  language: string,
  onSelect: (key: string) => void,
): ColumnDef<JobDto>[] {
  return [
    {
      id: 'name',
      header: t('jobs.columns.job'),
      size: 220,
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1 py-1">
          <Button variant="link" size="sm" className="max-w-full" onClick={() => onSelect(row.original.key)}>
            <TableText tone="strong">{row.original.name}</TableText>
          </Button>
          <TableText mono tone="weak" title={row.original.key}>
            {row.original.key}
          </TableText>
        </div>
      ),
    },
    {
      id: 'cron',
      header: t('jobs.columns.cron'),
      size: 130,
      cell: ({ row }) => <TableText mono>{row.original.cron}</TableText>,
    },
    {
      id: 'nextRunAt',
      header: t('jobs.columns.nextRun'),
      size: 160,
      cell: ({ row }) => <TableText mono>{jobTime(row.original.nextRunAt, language)}</TableText>,
    },
    {
      id: 'lastRun',
      header: t('jobs.columns.result'),
      size: 120,
      cell: ({ row }) =>
        row.original.lastRun ? (
          <div className="flex flex-col gap-1">
            <StatusBadge tone={row.original.lastRun.status === 'success' ? 'success' : 'danger'}>
              {t(`jobs.status.${row.original.lastRun.status}`)}
            </StatusBadge>
            <TableText tone="weak">{t('jobs.duration', { ms: row.original.lastRun.durationMs })}</TableText>
          </div>
        ) : (
          <TableText tone="weak">{t('jobs.neverRun')}</TableText>
        ),
    },
    {
      id: 'enabled',
      header: t('jobs.columns.enabled'),
      size: 90,
      cell: ({ row }) => (
        <StatusBadge tone={row.original.enabled ? 'success' : 'neutral'}>
          {t(row.original.enabled ? 'jobs.enabled' : 'jobs.disabled')}
        </StatusBadge>
      ),
    },
  ];
}
