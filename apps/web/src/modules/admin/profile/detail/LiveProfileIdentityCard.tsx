import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { DetailHeader } from '@/components/pro/page-scaffold';
import { QueryState } from '@/components/pro/QueryState';
import { BizError } from '@/lib/http/errors';
import { authKeys } from '@/modules/admin/auth/api/keys';
import { liveProfileApi, liveProfileQuery } from '../api/live-profile';
import { profileKeys } from '../api/keys';
import { LiveProfileFormDialog } from '../form/LiveProfileFormDialog';

export function LiveProfileIdentityCard() {
  const { t } = useTranslation('admin');
  const query = useQuery(liveProfileQuery);
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const mutation = useMutation({
    mutationFn: liveProfileApi.update,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: profileKeys.detail() }),
        client.invalidateQueries({ queryKey: authKeys.me() }),
      ]);
    },
    onError: (error) => {
      if (error instanceof BizError && error.code === 'user.version_conflict')
        void client.invalidateQueries({ queryKey: profileKeys.detail() });
    },
  });

  return (
    <QueryState
      data={query.data}
      pending={query.isPending}
      refreshing={query.isFetching}
      error={query.isError}
      loadingLabel={t('profile.title')}
      errorLabel={t('profile.live.loadFailed')}
      retryLabel={t('profile.live.retry')}
      onRetry={() => void query.refetch()}
    >
      {(profile) => (
        <>
          <DetailHeader
            title={profile.name}
            className="mb-0 px-5 py-5"
            avatar={
              <Avatar size="hero">
                <AvatarImage src={profile.avatar ?? undefined} alt={profile.name} />
                <AvatarFallback>{Array.from(profile.name)[0]}</AvatarFallback>
              </Avatar>
            }
            subtitle={
              <>
                <span>
                  {[profile.deptName, profile.postName, profile.employeeNo]
                    .map((value) => value || '—')
                    .join(' · ')}
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {profile.roleNames.map((role) => (
                    <StatusBadge key={role} tone="neutral">
                      {role}
                    </StatusBadge>
                  ))}
                </span>
              </>
            }
            actions={<Button onClick={() => setEditing(true)}>{t('profile.actions.edit')}</Button>}
          />
          {editing && (
            <LiveProfileFormDialog
              profile={profile}
              onClose={() => setEditing(false)}
              onSubmit={async (patch) => {
                await mutation.mutateAsync(patch);
              }}
            />
          )}
        </>
      )}
    </QueryState>
  );
}
