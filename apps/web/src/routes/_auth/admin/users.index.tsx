import { createFileRoute } from '@tanstack/react-router';
import { hasLegacyPositionFilter, usersSearchSchema } from '@/modules/admin/users/model';
import { UsersPage } from '@/modules/admin/users';
import { userDeptTreeQuery as deptTreeQuery } from '@/modules/admin/users/api';
import { usersQuery, type UsersQueryParams } from '@/modules/admin/users/api';
import type { UsersSearch } from '@/modules/admin/users/types';

export const Route = createFileRoute('/_auth/admin/users/')({
  validateSearch: (search) => usersSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    page: search.page,
    pageSize: search.pageSize,
    keyword: search.keyword,
    filters: search.filters,
    schemeId: search.schemeId,
    sort: search.sort,
  }),
  // 部门树和成员列表都进 Query 缓存；点击部门只改变 search，从而只刷新内容区的数据状态。
  // 列表用 prefetchQuery 而非 ensureQueryData：后者在翻页 / 换筛选出错时会抛给路由错误边界，
  // 整页变成 500 屏、旧数据全丢（2026-09-03 浏览器实测）；prefetch 吞掉错误，
  // 由 UsersScene 按 §3.12 处理——有旧数据就保留并在表头下挂通条，没有才在表内出错误屏。
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(deptTreeQuery),
      !hasLegacyPositionFilter(deps.filters)
        ? context.queryClient.prefetchQuery(usersQuery(deps))
        : Promise.resolve(),
    ]),
  staticData: {
    labelKey: 'users.title',
    permission: 'iam:user:view',
    groupKey: 'users.breadcrumbGroup',
    actions: [
      { key: 'user-create', code: 'iam:user:create', labelKey: 'users.actions.create' },
      { key: 'user-update', code: 'iam:user:update', labelKey: 'users.actions.edit' },
      { key: 'user-del', code: 'iam:user:delete', labelKey: 'users.actions.delete' },
      { key: 'user-disable', code: 'iam:user:change_status', labelKey: 'users.actions.disable' },
      { key: 'user-reset-pwd', code: 'iam:user:reset_password', labelKey: 'users.actions.resetPassword' },
      { key: 'user-assign-role', code: 'iam:user:assign_roles', labelKey: 'users.actions.assignRoles' },
      { key: 'user-move', code: 'iam:user:move', labelKey: 'users.actions.move' },
      { key: 'user-import', code: 'iam:user:import', labelKey: 'users.import.users' },
      { key: 'user-export', code: 'iam:user:export', labelKey: 'users.actions.export' },
    ],
  },
  component: UsersRoute,
});

function UsersRoute() {
  const search: UsersSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();

  const handleSearchChange = (patch: Partial<UsersQueryParams>) => {
    const next = { ...search, ...patch, keyword: patch.keyword ?? search.keyword };
    if (!next.filters) delete next.filters;
    if (!next.schemeId) delete next.schemeId;
    if (!next.sort) delete next.sort;
    void navigate({ search: next });
  };

  return (
    <UsersPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      search={search}
      onSearchChange={handleSearchChange}
      onOpenUser={(userId) =>
        void navigate({ to: '/admin/users/$userId', params: { userId }, search: { list: search } })
      }
      onCreateUser={() => void navigate({ to: '/admin/users/new' })}
      onEditUser={(userId) =>
        void navigate({
          to: '/admin/users/$userId/edit',
          params: { userId },
          search: { list: search, from: 'list' },
        })
      }
    />
  );
}
