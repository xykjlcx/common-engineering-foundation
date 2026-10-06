import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/modules/admin/settings';
export const Route = createFileRoute('/_auth/admin/settings')({
  staticData: {
    labelKey: 'settings.title',
    permission: 'sys:settings:view',
    actions: [{ key: 'settings-update', code: 'sys:settings:update', labelKey: 'settings.save' }],
  },
  component: SettingsRoute,
});
function SettingsRoute() {
  const { me } = Route.useRouteContext();
  return <SettingsPage canUpdate={me.systemAdmin || me.permissions.includes('sys:settings:update')} />;
}
