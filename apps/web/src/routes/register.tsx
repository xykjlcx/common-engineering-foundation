import { isDemoBuild } from '@/config';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { RegisterPage } from '@/modules/admin/auth';

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (!isDemoBuild) redirect({ to: '/login', replace: true, throw: true });
  },
  component: RegisterRoute,
});

function RegisterRoute() {
  const navigate = Route.useNavigate();
  return <RegisterPage onGoLogin={() => void navigate({ to: '/login' })} />;
}
