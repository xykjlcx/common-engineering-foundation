import { useState } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { SearchField } from '@/components/pro/SearchField';
import { Checkbox } from '@/components/ui/checkbox';
import { UsersMoveDialog } from '@/modules/admin/users';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { displayStatus, statusTone } from '@/modules/admin/users/model';
import { usersQuery, type UserDto } from '@/modules/admin/users/api';
import { DataTable } from '@/components/pro/DataTable';
import { QueryState } from '@/components/pro/QueryState';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';

export function DeptMembers({
  id,
  managed = false,
  adding = false,
  canMove = false,
  page = 1,
  pageSize = 10,
  keyword = '',
  includeChildren = false,
  onFilterChange,
}: {
  id: string;
  managed?: boolean;
  adding?: boolean;
  canMove?: boolean;
  page?: number;
  pageSize?: number;
  keyword?: string;
  includeChildren?: boolean;
  onFilterChange?: (patch: { page?: number; keyword?: string; includeChildren?: boolean }) => void;
}) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [moving, setMoving] = useState(false);
  const filters = JSON.stringify({
    op: 'and',
    items: adding
      ? [
          {
            id: 'incoming-members',
            op: 'or',
            items: [
              { id: 'outside-node', field: 'deptId', operator: 'ne', value: id, scope: 'exact' },
              { id: 'unassigned', field: 'deptId', operator: 'isEmpty', value: null },
            ],
          },
        ]
      : [
          {
            id: 'dept-members',
            field: 'deptId',
            operator: 'eq',
            value: id,
            ...(includeChildren ? {} : { scope: 'exact' }),
          },
        ],
  });
  const query = useQuery({
    ...usersQuery({ page: managed ? page : 1, pageSize, keyword, filters }),
    refetchOnMount: true,
  });
  const columns: ColumnDef<UserDto>[] = [
    {
      id: 'name',
      header: t('depts.memberName'),
      size: 150,
      cell: ({ row }) => <TableText>{row.original.name}</TableText>,
    },
    {
      id: 'employeeNo',
      header: t('users.columns.employeeNo'),
      size: 100,
      cell: ({ row }) => <TableText mono>{row.original.employeeNo ?? '—'}</TableText>,
    },
    {
      id: 'postName',
      header: t('depts.post'),
      size: 140,
      cell: ({ row }) => <TableText>{row.original.postName ?? '—'}</TableText>,
    },
    {
      id: 'status',
      header: t('depts.status'),
      size: 100,
      cell: ({ row }) => {
        const status = displayStatus(row.original);
        return <StatusBadge tone={statusTone(status)}>{t(`users.status.${status}`)}</StatusBadge>;
      },
    },
  ];
  return (
    <div className="grid gap-3">
      {managed && (
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            aria-label={t('depts.org.memberSearch')}
            placeholder={t('depts.org.memberSearch')}
            value={keyword}
            onChange={(event) => {
              setSelection({});
              onFilterChange?.({ keyword: event.currentTarget.value, page: 1 });
            }}
          />
          {!adding && (
            <label className="flex items-center gap-2">
              <Checkbox
                checked={includeChildren}
                onCheckedChange={(value) => {
                  setSelection({});
                  onFilterChange?.({ includeChildren: value, page: 1 });
                }}
              />
              {t('depts.org.includeChildren')}
            </label>
          )}
        </div>
      )}
      <QueryState
        data={query.data}
        pending={query.isPending}
        error={query.isError}
        loadingLabel={t('depts.members')}
        errorLabel={t('depts.membersFailed')}
        retryLabel={t('depts.retry')}
        onRetry={() => void query.refetch()}
      >
        {(data) => (
          <DataTable
            columns={columns}
            selection={
              managed && canMove && !query.isPlaceholderData
                ? {
                    enabled: true,
                    rowSelection: selection,
                    onRowSelectionChange: setSelection,
                    selectAllAriaLabel: t('users.selectPage'),
                    rowSelectAriaLabel: (row) => t('users.selectUser', { name: row.name }),
                    renderBulkBar: (ids) => (
                      <Button onClick={() => setMoving(true)}>
                        {t(adding ? 'depts.org.addMembers' : 'depts.org.moveMembers')} · {ids.length}
                      </Button>
                    ),
                  }
                : undefined
            }
            pagination={
              managed
                ? {
                    page,
                    pageCount: Math.max(1, Math.ceil(data.total / pageSize)),
                    total: data.total,
                    refreshing: query.isFetching,
                    totalLabel: t('users.pagination.filteredTotal', { count: data.total }),
                    prevLabel: t('users.pagination.prev'),
                    nextLabel: t('users.pagination.next'),
                    currentLabel: t('users.pagination.current', { page }),
                    onPageChange: (value) => {
                      setSelection({});
                      onFilterChange?.({ page: value });
                    },
                  }
                : undefined
            }
            data={data.list}
            rowKey={(row) => row.id}
            emptyText={t('depts.noMembers')}
            loadingText={t('depts.loading')}
          />
        )}
      </QueryState>
      {!managed && (
        <Button
          variant="link"
          onClick={() =>
            void navigate({ to: '/admin/users', search: { page: 1, pageSize: 10, keyword: '', filters } })
          }
        >
          {t('depts.viewAll')}
        </Button>
      )}
      {moving && query.data && (
        <UsersMoveDialog
          targets={query.data.list
            .filter((row) => selection[row.id])
            .map((row) => ({ id: row.id, version: row.version }))}
          targetNames={Object.fromEntries(query.data.list.map((row) => [row.id, row.name]))}
          initialDeptId={adding ? id : undefined}
          onClose={() => setMoving(false)}
          onSuccess={() => {
            setSelection({});
            void query.refetch();
          }}
        />
      )}
    </div>
  );
}
