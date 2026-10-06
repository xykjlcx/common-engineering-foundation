import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import type { OperationLogDto } from '../api/schema';
import { DataTable } from '@/components/pro/DataTable';
import { DetailSection } from '@/components/pro/page-scaffold';
import { StatusBadge, type StatusBadgeTone } from '@/components/pro/StatusBadge';
import { TableText } from '@/components/pro/TableText';
import { userOperationLogsQuery } from '../api/logs';
import { auditActionKey, emptyLogFilters, LOG_PAGE_SIZE, logQuery, type LogFilters } from '../model';
import { LogFilterBar } from './LogFilterBar';

const outcomeTones: Record<string, StatusBadgeTone> = {
  success: 'success',
  failure: 'danger',
  denied: 'warning',
};

export function OperationLogTab({ userId }: { userId: string }) {
  const { t } = useTranslation('admin');
  // 服务端分页：查询页码属于当前标签页，使用 DataTable 的受控分页 API。
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LogFilters>(emptyLogFilters);
  const result = useQuery(userOperationLogsQuery(userId, logQuery(page, filters)));
  const columns = useMemo<ColumnDef<OperationLogDto>[]>(
    () => [
      {
        accessorKey: 'at',
        header: t('users.detail.changeAt'),
        size: 180,
        cell: ({ row }) => (
          <TableText tone="weak" mono>
            {row.original.at.replace('T', ' ').slice(0, 19)}
          </TableText>
        ),
      },
      {
        accessorKey: 'action',
        header: t('users.detail.changeAction'),
        size: 240,
        cell: ({ row }) => {
          const key = auditActionKey(row.original.action);
          return (
            <TableText>
              {t(`users.logs.actions.${key ?? 'unknown'}`)}
              {!key && (
                <details>
                  <summary>{t('users.logs.technicalDetails')}</summary>
                  <code>{row.original.action}</code>
                </details>
              )}
            </TableText>
          );
        },
      },
      {
        accessorKey: 'operator',
        header: t('users.detail.changeOperator'),
        size: 240,
        cell: ({ row }) => (
          <TableText title={row.original.operatorName ?? undefined}>
            {row.original.operatorName ?? t('users.detail.notRecorded')}
          </TableText>
        ),
      },
      {
        accessorKey: 'outcome',
        header: t('users.detail.loginResult'),
        size: 140,
        cell: ({ row }) => {
          const outcome = row.original.outcome;
          const tone = outcomeTones[outcome];
          if (tone)
            return (
              <StatusBadge tone={tone} showDot={false}>
                {t(`users.detail.auditOutcomes.${outcome}`)}
              </StatusBadge>
            );
          return (
            <TableText>
              {t('users.logs.unknownOutcome')}
              <details>
                <summary>{t('users.logs.technicalDetails')}</summary>
                <code>{outcome}</code>
              </details>
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
      data-slot="user-oplog-tab"
      fill
      bodyClassName="p-0"
      toolbar={
        <LogFilterBar
          statuses={['success', 'failure', 'denied'].map((value) => ({
            value,
            label: t(`users.detail.auditOutcomes.${value}`),
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
            : t('users.detail.oplogEmptyDesc')
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
