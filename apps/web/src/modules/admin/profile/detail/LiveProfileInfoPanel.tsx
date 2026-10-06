import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DetailSection } from '@/components/pro/page-scaffold';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { QueryState } from '@/components/pro/QueryState';
import { maskPhone } from '@/lib/mask-phone';
import { liveProfileQuery } from '../api/live-profile';

export function LiveProfileInfoPanel() {
  const { t } = useTranslation('admin');
  const query = useQuery(liveProfileQuery);

  return (
    <QueryState
      data={query.data}
      pending={query.isPending}
      refreshing={query.isFetching}
      error={query.isError}
      loadingLabel={t('profile.sections.basic')}
      errorLabel={t('profile.live.loadFailed')}
      retryLabel={t('profile.live.retry')}
      onRetry={() => void query.refetch()}
    >
      {(profile) => (
        <DetailSection title={t('profile.sections.basic')}>
          <DescriptionList
            columns={2}
            size="compact"
            className="gap-x-6 gap-y-2 sm:grid-cols-2"
            items={[
              { label: t('profile.fields.username'), value: profile.username, mono: true },
              { label: t('profile.fields.employeeNo'), value: profile.employeeNo || '—', mono: true },
              {
                label: t('profile.fields.phone'),
                value: profile.phone ? maskPhone(profile.phone) : '—',
                mono: true,
              },
              { label: t('profile.fields.email'), value: profile.email || '—' },
              { label: t('profile.fields.department'), value: profile.deptName || '—' },
              { label: t('profile.fields.title'), value: profile.postName || '—' },
              { label: t('profile.fields.manager'), value: profile.managerName || '—' },
              { label: t('profile.fields.joinedAt'), value: profile.joinedAt || '—', mono: true },
              { label: t('profile.fields.location'), value: profile.workLocation || '—' },
              { label: t('profile.fields.bio'), value: profile.remark || '—' },
            ]}
          />
        </DetailSection>
      )}
    </QueryState>
  );
}
