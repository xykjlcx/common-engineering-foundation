import { userDetailSearchSchema, usersSearchSchema } from '@/modules/admin/users/model';
import { createFileRoute } from '@tanstack/react-router';
import { UserDetailScreen } from '@/modules/admin/users/detail/UserDetailScreen';

// 用户详情 = 整页（原型 UserDetail.dc.html：304px 左侧栏 + 四 tab；跨 tab 停留用整页不用抽屉）
export const Route = createFileRoute('/_auth/admin/users/$userId/')({
  validateSearch: (search) => userDetailSearchSchema.parse(search),
  staticData: {
    labelKey: 'users.detail.title',
    permissionRef: 'iam:user:view',
    groupKey: 'users.title',
  },
  component: UserDetailRoute,
});

function UserDetailRoute() {
  const { userId } = Route.useParams();
  const { list } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  return (
    <UserDetailScreen
      userId={userId}
      listContext={list}
      onNavigate={(id, next) =>
        void navigate({ to: '/admin/users/$userId', params: { userId: id }, search: { list: next } })
      }
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      onEdit={() => void navigate({ to: '/admin/users/$userId/edit', params: { userId }, search: { list } })}
      onBack={() => void navigate({ to: '/admin/users', search: list ?? usersSearchSchema.parse({}) })}
    />
  );
}
