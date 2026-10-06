import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { rolesQuery } from '@/modules/admin/roles/api';
import { RolesPage } from '@/modules/admin/roles';

// roleId 放在 URL search 中，让“选中某个角色”可刷新、可复制链接，也不会触发 Shell 重建。
const searchSchema = z.object({
  roleId: z.string().catch(''),
});

export const Route = createFileRoute('/_auth/admin/roles')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ roleId: search.roleId }),
  // 预取而非 ensureQueryData：后者请求失败会抛给路由错误边界，整页变错误屏、旧数据全丢；
  // prefetch 吞掉错误，由 RolesScene 用 QueryState + 上一份成功数据兜住。
  loader: ({ context }) => context.queryClient.prefetchQuery(rolesQuery),
  staticData: {
    labelKey: 'roles.title',
    permission: 'iam:role:view',
    groupKey: 'roles.breadcrumbGroup',
    actions: [
      { key: 'role-create', code: 'iam:role:create', labelKey: 'roles.actions.addRole' },
      { key: 'role-update', code: 'iam:role:update', labelKey: 'roles.actions.editRole' },
      { key: 'role-del', code: 'iam:role:del', labelKey: 'roles.actions.deleteRole' },
      { key: 'role-grant', code: 'iam:role:grant', labelKey: 'roles.actions.savePermissions' },
    ],
  },
  component: RolesRoute,
});

function RolesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();

  return (
    <RolesPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      roleId={search.roleId}
      onRoleIdChange={(roleId) => {
        void navigate({ search: { roleId } });
      }}
    />
  );
}
