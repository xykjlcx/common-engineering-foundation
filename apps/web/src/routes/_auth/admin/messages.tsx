import { createFileRoute } from '@tanstack/react-router';
import { MessagesPage } from '@/modules/admin/messages';
import { messagesSearchSchema } from '@/modules/admin/messages/model';
export const Route = createFileRoute('/_auth/admin/messages')({
  validateSearch: (search) => messagesSearchSchema.parse(search),
  staticData: { labelKey: 'messages.title' },
  component: MessagesRoute,
});
function MessagesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  return (
    <MessagesPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      search={search}
      onSearchChange={(patch) => void navigate({ search: { ...search, ...patch } })}
    />
  );
}
