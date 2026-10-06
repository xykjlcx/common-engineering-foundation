import { useCallback, useMemo, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useLastSuccessfulData } from '@/components/pro/use-last-successful-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { ListChrome, ListPageHeader, ListToolbar } from '@/components/pro/ListChrome';
import { PagePane, PagePaneFooter } from '@/components/pro/page-scaffold';
import { SearchField } from '@/components/pro/SearchField';
import { ColumnSettings } from '@/components/pro/ColumnSettings';
import { ToolbarIconActions } from '@/components/pro/DataToolbar';
import { useColumnPreferences } from '@/components/pro/use-column-preferences';
import { FullscreenSurface } from '@/components/pro/FullscreenSurface';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { SelectControl } from '@/components/ui/select';
import { useSearchDraft } from '@/lib/use-search-draft';
import { columnSettingsLabels } from '@/lib/list-labels';
import { jobsQuery, jobKeys } from '../api';
import { jobError } from '../model';
import { JobDetailPanel } from '../detail/JobDetailPanel';
import { JobLogsDialog } from '../detail/JobLogsDialog';
import type { JobsPageProps } from '../types';
import { jobColumns } from './columns';

export function JobsScene({ search, onSearchChange, permissions, systemAdmin }: JobsPageProps) {
  const { t, i18n } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const client = useQueryClient();
  const query = useQuery(jobsQuery(search));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const data = useLastSuccessfulData(query.data);
  const firstKey = data?.list[0]?.key;
  if (selectedKey === null && firstKey) setSelectedKey(firstKey);
  const activeKey = selectedKey ?? firstKey;
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => dirty && current.pathname !== next.pathname,
    enableBeforeUnload: dirty,
    withResolver: true,
  });
  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);
  const select = useCallback(
    (key: string) => {
      if (key === activeKey) return;
      if (dirty) setPendingKey(key);
      else setSelectedKey(key);
    },
    [activeKey, dirty],
  );
  const columns = useMemo(() => jobColumns(t, i18n.language, select), [t, i18n.language, select]);
  const { prefs, setPrefs, resetPrefs, columnState, columnItems, setColumns } = useColumnPreferences(
    'admin.jobs',
    columns,
    { density: 'relaxed' },
  );
  const [keyword, changeKeyword] = useSearchDraft(search.keyword, (value) =>
    onSearchChange({ keyword: value, page: 1 }),
  );
  const filtered = !!search.keyword || search.enabled !== undefined;
  const total = data?.total ?? 0;
  const list = (
    <>
      <div className="px-5 pt-3">
        <ListPageHeader
          title={t('jobs.title')}
          count={t(filtered ? 'jobs.filteredCount' : 'jobs.count', { count: total })}
          actions={
            <Button variant="secondary" onClick={() => setLogsOpen(true)}>
              {t('jobs.logs')}
            </Button>
          }
        />
      </div>
      <ListChrome
        toolbar={
          <ListToolbar
            leading={
              <>
                <SearchField
                  value={keyword}
                  aria-label={t('jobs.search')}
                  placeholder={t('jobs.search')}
                  containerClassName="w-[calc(210px*var(--app-scale))] shrink-0"
                  onChange={(event) => changeKeyword(event.target.value)}
                />
                <SelectControl
                  className="w-[calc(150px*var(--app-scale))] shrink-0"
                  aria-label={t('jobs.filterStatus')}
                  value={search.enabled === undefined ? '' : String(search.enabled)}
                  options={[
                    { value: '', label: t('jobs.allStatuses') },
                    { value: 'true', label: t('jobs.enabled') },
                    { value: 'false', label: t('jobs.disabled') },
                  ]}
                  onValueChange={(value) =>
                    onSearchChange({ enabled: value === '' ? undefined : value === 'true', page: 1 })
                  }
                />
                {filtered && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      changeKeyword('');
                      onSearchChange({ keyword: '', enabled: undefined, page: 1 });
                    }}
                  >
                    {t('jobs.clearFilters')}
                  </Button>
                )}
                <ToolbarIconActions
                  onRefresh={() => client.invalidateQueries({ queryKey: jobKeys.all })}
                  refreshing={query.isFetching && !query.isPending}
                  fullscreen={{ active: fullscreen, onToggle: () => setFullscreen((value) => !value) }}
                  labels={{
                    refresh: tc('table.refresh'),
                    fullscreen: tc('table.fullscreen'),
                    exitFullscreen: tc('table.exitFullscreen'),
                  }}
                >
                  <ColumnSettings
                    density={prefs.density}
                    onDensityChange={(density) => setPrefs({ density })}
                    columns={columnItems}
                    onColumnsChange={setColumns}
                    onReset={resetPrefs}
                    labels={columnSettingsLabels(tc)}
                  />
                </ToolbarIconActions>
              </>
            }
          />
        }
      />
      <DataTable
        columns={columns}
        data={data?.list ?? []}
        rowKey={(job) => job.key}
        rowState={(job) => (job.key === activeKey ? 'selected' : undefined)}
        onRowClick={(job) => select(job.key)}
        loading={query.isPending}
        busy={query.isFetching && !query.isPending}
        busyLabel={t('jobs.loading')}
        error={query.isError}
        errorText={jobError(query.error, t)}
        retryText={t('jobs.retry')}
        onRetry={() => void query.refetch()}
        emptyText={t(filtered ? 'jobs.noMatch' : 'jobs.empty')}
        loadingText={t('jobs.loading')}
        skeletonRows={3}
        columnState={columnState}
        onColumnStateChange={setPrefs}
        density={prefs.density}
        errorBanner={
          query.isError && data
            ? {
                message: jobError(query.error, t),
                retryLabel: t('jobs.retry'),
                copyLabel: t('jobs.copyTrace'),
                onRetry: () => void query.refetch(),
              }
            : undefined
        }
        pagination={{
          page: search.page,
          pageCount: Math.max(1, Math.ceil(total / search.pageSize)),
          total,
          totalLabel: t('jobs.count', { count: total }),
          currentLabel: t('jobs.currentPage', { page: search.page }),
          prevLabel: t('jobs.prev'),
          nextLabel: t('jobs.next'),
          onPageChange: (page) => onSearchChange({ page }),
          pageSize: {
            value: search.pageSize,
            options: [10, 20, 50, 100],
            ariaLabel: t('jobs.pageSizeLabel'),
            label: (size) => t('jobs.pageSize', { size }),
            onChange: (pageSize) => onSearchChange({ pageSize, page: 1 }),
          },
        }}
      />
      <PagePaneFooter hint={t('jobs.registeredHint')} />
    </>
  );
  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto lg:flex-row">
        <PagePane variant="master" className="min-h-[calc(300px*var(--app-scale))] flex-1">
          {fullscreen ? (
            <FullscreenSurface
              title={t('jobs.title')}
              subtitle={t('jobs.count', { count: total })}
              escHint={tc('table.escToExit')}
              exitLabel={tc('table.exitFullscreen')}
              onExit={() => setFullscreen(false)}
            >
              {list}
            </FullscreenSurface>
          ) : (
            list
          )}
        </PagePane>
        {activeKey && (
          <JobDetailPanel
            key={activeKey}
            jobKey={activeKey}
            permissions={permissions}
            systemAdmin={systemAdmin}
            onDirtyChange={onDirtyChange}
            onClose={() => select('')}
          />
        )}
      </div>
      <ConfirmDialog
        open={blocker.status === 'blocked'}
        title={t('jobs.discardTitle')}
        description={t('jobs.discardDescription')}
        severity="reversible"
        cancelText={t('jobs.keepEditing')}
        confirmText={t('jobs.discard')}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        onConfirm={() => blocker.proceed?.()}
      />
      {logsOpen && <JobLogsDialog onClose={() => setLogsOpen(false)} />}
      <ConfirmDialog
        open={pendingKey !== null}
        title={t('jobs.discardTitle')}
        description={t('jobs.discardDescription')}
        severity="reversible"
        cancelText={t('jobs.keepEditing')}
        confirmText={t('jobs.discard')}
        onOpenChange={(open) => {
          if (!open) setPendingKey(null);
        }}
        onConfirm={() => {
          setSelectedKey(pendingKey);
          setPendingKey(null);
          setDirty(false);
        }}
      />
    </>
  );
}
