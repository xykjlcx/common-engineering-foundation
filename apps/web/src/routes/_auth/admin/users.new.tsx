import { createFileRoute } from '@tanstack/react-router';
import { UserFormPage } from '@/modules/admin/users/form/UserFormPage';

// 新建用户 = 整页表单（原型 UserForm.dc.html：面包屑「用户管理 / 新建用户」+ 三组分区 + 底部操作条）
export const Route = createFileRoute('/_auth/admin/users/new')({
  staticData: {
    labelKey: 'users.form.createTitle',
    permissionRef: 'iam:user:create',
    groupKey: 'users.title',
  },
  component: UserCreateRoute,
});

function UserCreateRoute() {
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  return (
    <UserFormPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      mode="create"
      onDone={(userId) =>
        void (userId
          ? navigate({ to: '/admin/users/$userId', params: { userId } })
          : navigate({ to: '/admin/users', search: { page: 1, pageSize: 15, keyword: '' } }))
      }
      onCancel={() => void navigate({ to: '/admin/users', search: { page: 1, pageSize: 15, keyword: '' } })}
    />
  );
}
