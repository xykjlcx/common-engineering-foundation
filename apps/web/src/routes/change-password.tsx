import { createFileRoute } from '@tanstack/react-router';
import { ChangePasswordPage } from '@/modules/admin/auth';

export const Route = createFileRoute('/change-password')({ component: ChangePasswordRoute });

function ChangePasswordRoute() {
  const navigate = Route.useNavigate();
  return (
    <ChangePasswordPage
      onGoLogin={async () => {
        await navigate({ to: '/login', replace: true });
      }}
    />
  );
}
