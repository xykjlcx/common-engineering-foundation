import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/pro/DataTable';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { DetailSection } from '@/components/pro/page-scaffold';
import { userLoginLogsQuery } from '../api/logs';
import type { LoginRecordDto } from '../api/schema';
import { describeDevice, emptyLogFilters, LOG_PAGE_SIZE, logQuery, type LogFilters } from '../model';
import { LogFilterBar } from './LogFilterBar';

const reasonKeys: Record<string, string> = {
  bad_credentials: 'credentials',
  account_locked: 'accountLocked',
  ip_locked: 'ipLocked',
  status_rejected: 'statusRejected',
};
export function LoginTab({ userId }: { userId: string }) {
  const { t } = useTranslation('admin');
  // 服务端分页：本标签页持有查询页码，DataTable 负责统一分页交互。
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LogFilters>(emptyLogFilters);
  const result = useQuery(userLoginLogsQuery(userId, logQuery(page, filters)));
  const columns = useMemo<ColumnDef<LoginRecordDto>[]>(
    () => [
      {
        accessorKey: 'at',
        header: t('users.detail.loginAt'),
        size: 180,
        cell: ({ row }) => (
          <TableText tone="weak" mono>
            {row.original.at.replace('T', ' ').slice(0, 19)}
          </TableText>
        ),
      },
      {
        accessorKey: 'ip',
        header: t('users.detail.loginIp'),
        size: 150,
        cell: ({ row }) => <TableText mono>{row.original.ip ?? '—'}</TableText>,
      },
      {
        accessorKey: 'device',
        header: t('users.detail.loginDevice'),
        size: 220,
        cell: ({ row }) => {
          const device = row.original.device;
          return <TableText title={device ?? undefined}>{describeDevice(device) ?? device ?? '—'}</TableText>;
        },
      },
      {
        accessorKey: 'result',
        header: t('users.detail.loginResult'),
        size: 100,
        cell: ({ row }) => (
          <StatusBadge tone={row.original.result === 'success' ? 'success' : 'danger'} showDot={false}>
            {t(`users.detail.loginResults.${row.original.result}`)}
          </StatusBadge>
        ),
      },
      {
        accessorKey: 'reason',
        header: t('users.logs.reason'),
        size: 220,
        cell: ({ row }) => {
          const reason = row.original.reason;
          if (!reason) return <TableText>—</TableText>;
          const key = reasonKeys[reason];
          return (
            <TableText>
              {t(`users.logs.reasons.${key ?? 'unknown'}`)}
              {!key && (
                <details>
                  <summary>{t('users.logs.technicalDetails')}</summary>
                  <code>{reason}</code>
                </details>
              )}
            </TableText>
          );
        },
      },
    ],
    [t],
  );
  const data = result.data;
  return (
    <DetailSection
      data-slot="user-login-tab"
      fill
      bodyClassName="p-0"
      toolbar={
        <LogFilterBar
          statuses={['success', 'failure', 'locked'].map((value) => ({
            value,
            label: t(`users.detail.loginResults.${value}`),
          }))}
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
      }
    >
      <DataTable
        columns={columns}
        data={data?.list ?? []}
        rowKey={(row) => row.id}
        density="relaxed"
        enableColumnResizing={false}
        loading={result.isPending}
        error={result.isError}
        errorText={t('users.logs.loadFailed')}
        retryText={t('users.retry')}
        onRetry={() => {
          void result.refetch();
        }}
        emptyText={
          filters.status !== 'all' || filters.range
            ? t('users.logs.filters.noMatch')
            : t('users.detail.noLoginRecords')
        }
        loadingText={t('users.logs.loading')}
        pagination={
          data
            ? {
                page,
                pageCount: Math.max(1, Math.ceil(data.total / LOG_PAGE_SIZE)),
                total: data.total,
                totalLabel: t('users.logs.total', { count: data.total }),
                refreshing: result.isFetching,
                refreshingLabel: t('users.refreshing'),
                prevLabel: t('users.pagination.prev'),
                nextLabel: t('users.pagination.next'),
                currentLabel: t('users.pagination.current', { page }),
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </DetailSection>
  );
}
