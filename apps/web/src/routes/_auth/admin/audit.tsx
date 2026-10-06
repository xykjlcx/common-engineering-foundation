import { createFileRoute } from '@tanstack/react-router';
import { AuditPage } from '@/modules/admin/audit';
import { auditSearchSchema } from '@/modules/admin/audit/model';

export const Route = createFileRoute('/_auth/admin/audit')({
  validateSearch: (search) => auditSearchSchema.parse(search),
  staticData: {
    labelKey: 'audit.title',
    permission: 'sys:audit:view',
    actions: [
      { key: 'audit-log-view', code: 'audit:log:view', labelKey: 'audit.logView' },
      { key: 'audit-session-view', code: 'audit:session:view', labelKey: 'audit.sessionView' },
      { key: 'audit-session-revoke', code: 'audit:session:revoke', labelKey: 'audit.sessionRevoke' },
    ],
  },
  component: AuditRoute,
});

function AuditRoute() {
  const search = Route.useSearch();
  const { me } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  return (
    <AuditPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      search={search}
      onSearchChange={(patch) => void navigate({ search: { ...search, ...patch } })}
    />
  );
}
