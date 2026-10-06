import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { TableText } from '@/components/pro/TableText';
import { authzContext, matchPermission } from '@/lib/permission';
import { useJobMutations, type JobDto } from '../api';
import { jobError } from '../model';
export function JobCommands({
  job,
  permissions,
  systemAdmin,
}: {
  job: JobDto;
  permissions: string[];
  systemAdmin?: boolean;
}) {
  const { t } = useTranslation('admin');
  const authz = authzContext(permissions, systemAdmin);
  const mutations = useJobMutations();
  const [runVersion, setRunVersion] = useState<number | null>(null);
  const busy = mutations.run.isPending || mutations.setEnabled.isPending;
  const error = mutations.setEnabled.error;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {matchPermission(authz, 'sys:job:update') && (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            loading={mutations.setEnabled.isPending}
            onClick={() =>
              mutations.setEnabled.mutate({ key: job.key, version: job.version, enabled: !job.enabled })
            }
          >
            {t(job.enabled ? 'jobs.disable' : 'jobs.enable')}
          </Button>
        )}
        {matchPermission(authz, 'sys:job:run') && (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => {
              mutations.run.reset();
              setRunVersion(job.version);
            }}
          >
            {t('jobs.run')}
          </Button>
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{jobError(error, t)}</AlertDescription>
        </Alert>
      )}
      {mutations.run.data && (
        <TableText
          role="status"
          tone={mutations.run.data.status === 'success' ? 'success' : 'danger'}
          className="whitespace-normal"
        >
          {t(mutations.run.data.status === 'success' ? 'jobs.runSucceeded' : 'jobs.runFailed')} ·{' '}
          {mutations.run.data.message}
        </TableText>
      )}
      <ConfirmDialog
        open={runVersion !== null}
        severity="reversible"
        title={t('jobs.runTitle')}
        description={t('jobs.runDescription', { name: job.name })}
        cancelText={t('jobs.cancel')}
        confirmText={t('jobs.run')}
        pending={mutations.run.isPending}
        error={mutations.run.error ? jobError(mutations.run.error, t) : undefined}
        onOpenChange={(open) => {
          if (!open) setRunVersion(null);
        }}
        onConfirm={async () => {
          if (runVersion === null) return;
          await mutations.run.mutateAsync({ key: job.key, version: runVersion });
          setRunVersion(null);
        }}
      />
    </div>
  );
}
