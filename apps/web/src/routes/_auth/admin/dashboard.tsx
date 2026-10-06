import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/modules/admin/dashboard';

export const Route = createFileRoute('/_auth/admin/dashboard')({
  staticData: {
    labelKey: 'dashboard.navTitle',
    access: 'authenticated',
    groupKey: 'dashboard.navGroup',
  },
  component: DashboardRoute,
});

function DashboardRoute() {
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  return (
    <DashboardPage
      identity={me}
      onNavigate={(path) => {
        void navigate({ to: path });
      }}
    />
  );
}
