import { z } from 'zod';
import { userDetailSearchSchema, userEditExit } from '@/modules/admin/users/model';
import { createFileRoute } from '@tanstack/react-router';
import { UserFormPage } from '@/modules/admin/users/form/UserFormPage';

// 编辑用户 = 与新建同一整页表单（form/ 合一，mode 区分）
export const Route = createFileRoute('/_auth/admin/users/$userId/edit')({
  // from：进入编辑页的来源；从列表直接进入的，保存或取消后回到列表，而不是绕到详情页。
  validateSearch: (search) =>
    userDetailSearchSchema.extend({ from: z.enum(['list']).optional() }).parse(search),
  staticData: {
    labelKey: 'users.form.editTitle',
    permissionRef: 'iam:user:update',
    groupKey: 'users.title',
  },
  component: UserEditRoute,
});

function UserEditRoute() {
  const { userId } = Route.useParams();
  const { list, from } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  const leave = () => void navigate(userEditExit(from, list, userId));
  return (
    <UserFormPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      mode="edit"
      userId={userId}
      onDone={leave}
      onCancel={leave}
    />
  );
}
