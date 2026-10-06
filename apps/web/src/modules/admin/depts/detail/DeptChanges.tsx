import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { operationsQuery, type OperationDto } from '@/modules/admin/audit/api';
import {
  auditActionLabel,
  defaultAuditRange,
  formatAuditTime,
  outcomeTone,
} from '@/modules/admin/audit/model';
import { DataTable } from '@/components/pro/DataTable';
import { QueryState } from '@/components/pro/QueryState';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';

export function DeptChanges({ id }: { id: string }) {
  const { t } = useTranslation('admin');
  const [page, setPage] = useState(1);
  const [range] = useState(() => defaultAuditRange());
  const query = useQuery(operationsQuery({ ...range, page, pageSize: 10, objectType: 'dept', objectId: id }));
  const columns: ColumnDef<OperationDto>[] = [
    {
      id: 'time',
      header: t('audit.time'),
      size: 180,
      cell: ({ row }) => <TableText mono>{formatAuditTime(row.original.createdAt)}</TableText>,
    },
    {
      id: 'actor',
      header: t('audit.actor'),
      size: 110,
      cell: ({ row }) => <TableText>{row.original.actorName}</TableText>,
    },
    {
      id: 'action',
      header: t('audit.action'),
      size: 160,
      cell: ({ row }) => <TableText>{auditActionLabel(t, row.original.action)}</TableText>,
    },
    {
      id: 'outcome',
      header: t('audit.outcome'),
      size: 90,
      cell: ({ row }) => (
        <StatusBadge tone={outcomeTone(row.original.outcome)}>
          {t(`audit.outcomes.${row.original.outcome}`)}
        </StatusBadge>
      ),
    },
  ];
  return (
    <div className="grid gap-2">
      <TableText tone="hint">{t('depts.changesRange')}</TableText>
      <QueryState
        data={query.data}
        pending={query.isPending}
        error={query.isError}
        loadingLabel={t('depts.changes')}
        errorLabel={t('depts.changesFailed')}
        retryLabel={t('depts.retry')}
        onRetry={() => void query.refetch()}
      >
        {(data) => (
          <DataTable
            columns={columns}
            data={data.list}
            rowKey={(row) => row.id}
            pagination={{
              page,
              total: data.total,
              pageCount: Math.max(1, Math.ceil(data.total / 10)),
              totalLabel: t('depts.recordCount', { count: data.total }),
              prevLabel: t('audit.prev'),
              nextLabel: t('audit.next'),
              currentLabel: t('audit.current', { page }),
              onPageChange: (next) => setPage(next),
            }}
            emptyText={t('depts.noChanges')}
            loadingText={t('depts.loading')}
          />
        )}
      </QueryState>
    </div>
  );
}
