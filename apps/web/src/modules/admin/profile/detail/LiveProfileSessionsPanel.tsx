import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { DetailSection } from '@/components/pro/page-scaffold';
import { DataTable } from '@/components/pro/DataTable';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { sessionDevice } from '@/lib/session-device';
import { formatLocalDateTime } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/pro/QueryState';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { liveProfileApi, liveSessionsQuery, type LiveSessionDto } from '../api/live-profile';
import { profileKeys } from '../api/keys';

export function LiveProfileSessionsPanel({ onCurrentRevoked }: { onCurrentRevoked: () => Promise<void> }) {
  const { t } = useTranslation('admin');
  const client = useQueryClient();
  const query = useQuery(liveSessionsQuery);
  const [target, setTarget] = useState<string | null>(null);
  const revoke = useMutation({
    mutationFn: liveProfileApi.revokeSession,
    onSuccess: async (result) => {
      if (result.current) await onCurrentRevoked();
      else await client.invalidateQueries({ queryKey: profileKeys.devices() });
      setTarget(null);
    },
  });
  const columns: ColumnDef<LiveSessionDto>[] = [
    {
      id: 'device',
      header: t('profile.live.device'),
      size: 180,
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <TableText title={row.original.ua ?? undefined}>{sessionDevice(row.original.ua) || '—'}</TableText>
          {row.original.current && <StatusBadge tone="info">{t('profile.live.current')}</StatusBadge>}
        </div>
      ),
    },
    {
      id: 'ip',
      header: t('profile.live.ip'),
      size: 130,
      cell: ({ row }) => <TableText mono>{row.original.ip || '—'}</TableText>,
    },
    ...(['createdAt', 'lastActiveAt', 'expiresAt'] as const).map((field) => ({
      id: field,
      header: t(`profile.live.${field === 'lastActiveAt' ? 'renewedAt' : field}`),
      size: 175,
      cell: ({ row }: { row: { original: LiveSessionDto } }) => (
        <TableText mono>{formatLocalDateTime(row.original[field])}</TableText>
      ),
    })),
    {
      id: 'actions',
      header: t('profile.live.actions'),
      size: 110,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          disabled={revoke.isPending}
          onClick={() => {
            revoke.reset();
            setTarget(row.original.handle);
          }}
        >
          {t('profile.live.revoke')}
        </Button>
      ),
    },
  ];
  return (
    <>
      <QueryState
        data={query.data}
        pending={query.isPending}
        refreshing={query.isFetching}
        error={query.isError}
        loadingLabel={t('profile.sections.devices')}
        errorLabel={t('profile.live.loadFailed')}
        retryLabel={t('profile.live.retry')}
        onRetry={() => void query.refetch()}
      >
        {(data) => (
          <DetailSection title={t('profile.sections.devices')}>
            <DataTable
              columns={columns}
              data={data.sessions}
              rowKey={(session) => session.handle}
              density="relaxed"
              loadingText={t('profile.live.loadingSessions')}
              emptyText={t('profile.live.noSessions')}
            />
          </DetailSection>
        )}
      </QueryState>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title={t('profile.live.revokeTitle')}
        description={t('profile.live.revokeDescription')}
        confirmText={t('profile.live.confirmRevoke')}
        cancelText={t('profile.actions.cancel')}
        pending={revoke.isPending}
        error={revoke.isError ? t('profile.live.revokeFailed') : undefined}
        onConfirm={async () => {
          if (target) await revoke.mutateAsync(target);
        }}
      />
    </>
  );
}
