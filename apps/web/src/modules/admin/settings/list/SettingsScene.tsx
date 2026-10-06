import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QueryState } from '@/components/pro/QueryState';
import { settingsQuery } from '../api';
import { SettingsForm } from '../form/SettingsForm';
import type { SettingsPageProps } from '../types';
export function SettingsScene(props: SettingsPageProps) {
  const { t } = useTranslation('admin');
  const result = useQuery(settingsQuery);
  return (
    <QueryState
      data={result.data}
      pending={result.isPending}
      refreshing={result.isFetching && !result.isPending}
      error={result.isError}
      loadingLabel={t('settings.loading')}
      errorLabel={t('settings.errors.load')}
      retryLabel={t('settings.reload')}
      onRetry={() => void result.refetch()}
      className="flex min-h-0 flex-1 flex-col [&_[data-slot=query-state-content]]:flex [&_[data-slot=query-state-content]]:min-h-0 [&_[data-slot=query-state-content]]:flex-1 [&_[data-slot=query-state-content]]:flex-col"
    >
      {(initial) => <SettingsForm initial={initial} canUpdate={props.canUpdate} />}
    </QueryState>
  );
}
