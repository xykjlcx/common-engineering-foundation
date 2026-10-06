import { createFileRoute } from '@tanstack/react-router';
import { JobsPage } from '@/modules/admin/jobs';
import { jobsSearchSchema } from '@/modules/admin/jobs/model';
export const Route = createFileRoute('/_auth/admin/jobs')({
  validateSearch: (search) => jobsSearchSchema.parse(search),
  staticData: {
    labelKey: 'jobs.title',
    permission: 'sys:job:view',
    actions: [
      { key: 'job-update', code: 'sys:job:update', labelKey: 'jobs.save' },
      { key: 'job-run', code: 'sys:job:run', labelKey: 'jobs.run' },
    ],
  },
  component: JobsRoute,
});
function JobsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  return (
    <JobsPage
      search={search}
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      onSearchChange={(patch) => void navigate({ search: { ...search, ...patch } })}
    />
  );
}
