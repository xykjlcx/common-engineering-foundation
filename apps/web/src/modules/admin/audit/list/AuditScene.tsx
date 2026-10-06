import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PagePane, PageTabs } from '@/components/pro/page-scaffold';
import { ListPageHeader } from '@/components/pro/ListChrome';
import { QueryState } from '@/components/pro/QueryState';
import { auditEntryQuery } from '../api';
import { auditError } from '../model';
import type { AuditPageProps } from '../types';
import { OperationScene } from './OperationScene';
import { LoginScene } from './LoginScene';
import { SessionScene } from './SessionScene';

export function AuditScene({ search, onSearchChange, permissions, systemAdmin }: AuditPageProps) {
  const { t } = useTranslation('admin');
  const entry = useQuery(auditEntryQuery);
  const data = entry.data;
  const tab = data?.tabs.includes(search.tab) ? search.tab : data?.tabs[0];

  return (
    <PagePane variant="master" className="flex-1">
      <div className="px-5 pt-3">
        <ListPageHeader title={t('audit.title')} />
      </div>
      {(!data || entry.isError) && (
        <QueryState
          data={data}
          pending={entry.isPending}
          error={entry.isError}
          errorLabel={auditError(entry.error, t('audit.loadFailed'))}
          loadingLabel={t('audit.loading')}
          retryLabel={t('audit.retry')}
          onRetry={() => void entry.refetch()}
        >
          {() => null}
        </QueryState>
      )}
      {data && (
        <>
          <PageTabs
            value={tab ?? 'oplog'}
            items={data.tabs.map((value) => ({ value, label: t(`audit.tabs.${value}`) }))}
            ariaLabel={t('audit.tabsLabel')}
            onValueChange={(value) => onSearchChange({ tab: value })}
          />
          {tab === 'oplog' ? (
            <OperationScene
              search={search.op}
              onSearchChange={(patch) => onSearchChange({ op: { ...search.op, ...patch } })}
            />
          ) : tab === 'login' ? (
            <LoginScene
              search={search.login}
              onSearchChange={(patch) => onSearchChange({ login: { ...search.login, ...patch } })}
            />
          ) : tab === 'sessions' ? (
            <SessionScene
              permissions={permissions}
              systemAdmin={systemAdmin}
              search={search.sessions}
              onSearchChange={(patch) => onSearchChange({ sessions: { ...search.sessions, ...patch } })}
            />
          ) : null}
        </>
      )}
    </PagePane>
  );
}
