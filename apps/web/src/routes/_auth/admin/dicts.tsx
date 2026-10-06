import { createFileRoute } from '@tanstack/react-router';
import { DictsPage } from '@/modules/admin/dicts';
import { dictSearchSchema } from '@/modules/admin/dicts/model';

export const Route = createFileRoute('/_auth/admin/dicts')({
  validateSearch: (search) => dictSearchSchema.parse(search),
  staticData: {
    labelKey: 'dicts.title',
    permission: 'sys:dict:view',
    actions: [
      { key: 'dict-create', code: 'sys:dict:create', labelKey: 'dicts.createType' },
      { key: 'dict-update', code: 'sys:dict:update', labelKey: 'dicts.edit' },
      { key: 'dict-delete', code: 'sys:dict:delete', labelKey: 'dicts.delete' },
    ],
  },
  component: DictsRoute,
});

function DictsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();

  return (
    <DictsPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      search={search}
      onSearchChange={(patch) => void navigate({ search: { ...search, ...patch } })}
    />
  );
}
