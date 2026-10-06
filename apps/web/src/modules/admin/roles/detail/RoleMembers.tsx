import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { displayStatus, statusTone } from '@/modules/admin/users/model';
import { userDeptTreeQuery, userDeptPathLabel } from '@/modules/admin/users/api/dictionaries';
import { usersQuery, type UserDto } from '@/modules/admin/users/api';
import { DataTable } from '@/components/pro/DataTable';
import { QueryState } from '@/components/pro/QueryState';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';

export function RoleMembers({ id }: { id: string }) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const departments = useQuery(userDeptTreeQuery);
  const filters = JSON.stringify({
    op: 'and',
    items: [{ id: 'role-members', field: 'roleIds', operator: 'in', value: [id] }],
  });
  const query = useQuery({ ...usersQuery({ page: 1, pageSize: 10, filters }), refetchOnMount: true });
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
      id: 'deptName',
      header: t('depts.department'),
      size: 140,
      cell: ({ row }) => (
        <TableText>{userDeptPathLabel(departments.data ?? [], row.original.deptId)}</TableText>
      ),
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
            data={data.list}
            rowKey={(row) => row.id}
            emptyText={t('depts.noMembers')}
            loadingText={t('depts.loading')}
          />
        )}
      </QueryState>
      <Button
        variant="link"
        onClick={() =>
          void navigate({ to: '/admin/users', search: { page: 1, pageSize: 10, keyword: '', filters } })
        }
      >
        {t('depts.viewAll')}
      </Button>
    </div>
  );
}
