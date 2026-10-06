import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { UserAvatar } from '@/modules/admin/users';
import { userDeptTreeQuery } from '@/modules/admin/users/api/dictionaries';
import { usersQuery } from '@/modules/admin/users/api';
import { DataTable } from '@/components/pro/DataTable';
import { TableText } from '@/components/pro/TableText';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PostMembers({ id }: { id: string }) {
  const { t } = useTranslation('admin');
  const { data: departments = [] } = useQuery(userDeptTreeQuery);
  const [page, setPage] = useState(1);

  const query = useQuery({
    ...usersQuery({
      page,
      pageSize: 5,
      filters: JSON.stringify({
        op: 'and',
        items: [{ id: 'post', field: 'postId', operator: 'eq', value: id }],
      }),
    }),
    refetchOnMount: true,
  });

  return (
    <div className="flex flex-col gap-2">
      <TableText tone="strong">{t('posts.members')}</TableText>
      <DataTable
        columns={[
          {
            id: 'name',
            header: t('users.columns.name'),
            cell: ({ row }) => (
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar name={row.original.name} src={row.original.avatar} />
                <Link
                  className={cn(buttonVariants({ variant: 'link', size: 'sm' }))}
                  to="/admin/users/$userId"
                  params={{ userId: row.original.id }}
                  search={{}}
                >
                  <TableText className="block max-w-full truncate" title={row.original.name}>
                    {row.original.name}
                  </TableText>
                </Link>
                <TableText className="ml-auto block truncate">
                  {departments.find((dept) => dept.id === row.original.deptId)?.name ?? '—'}
                </TableText>
              </div>
            ),
          },
        ]}
        data={query.data?.list ?? []}
        rowKey={(user) => user.id}
        loading={query.isPending}
        loadingText={t('users.loading.list')}
        error={query.isError}
        errorText={t('users.loadFailed')}
        onRetry={() => void query.refetch()}
        retryText={t('users.retry')}
        emptyText={t('posts.noMembers')}
        pagination={{
          page,
          pageCount: Math.max(1, Math.ceil((query.data?.total ?? 0) / 5)),
          total: query.data?.total ?? 0,
          totalLabel: t('users.countPeople', { count: query.data?.total ?? 0 }),
          prevLabel: t('users.pagination.prev'),
          nextLabel: t('users.pagination.next'),
          currentLabel: t('users.pagination.current', { page }),
          onPageChange: setPage,
        }}
      />
      <TableText className="overflow-visible whitespace-normal">{t('posts.usageHint')}</TableText>
    </div>
  );
}
