import { createFileRoute } from '@tanstack/react-router';
import { NoticesPage } from '@/modules/admin/notices';
import { noticesSearchSchema } from '@/modules/admin/notices/model';
export const Route = createFileRoute('/_auth/admin/notices')({
  validateSearch: (search) => noticesSearchSchema.parse(search),
  staticData: {
    labelKey: 'notices.title',
    permission: 'iam:notice:view',
    actions: [
      { key: 'notice-create', code: 'iam:notice:create', labelKey: 'notices.create' },
      { key: 'notice-update', code: 'iam:notice:update', labelKey: 'notices.edit' },
      { key: 'notice-delete', code: 'iam:notice:delete', labelKey: 'notices.delete' },
      { key: 'notice-publish', code: 'iam:notice:publish', labelKey: 'notices.publish' },
      { key: 'notice-withdraw', code: 'iam:notice:withdraw', labelKey: 'notices.withdraw' },
    ],
  },
  component: NoticesRoute,
});
function NoticesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  return (
    <NoticesPage
      search={search}
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      onSearchChange={(patch) => void navigate({ search: { ...search, ...patch } })}
    />
  );
}
