import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ColumnSettings } from '@/components/pro/ColumnSettings';
import { DataTable } from '@/components/pro/DataTable';
import { ToolbarIconActions } from '@/components/pro/DataToolbar';
import { chipCount } from '@/components/pro/filter-builder';
import { FilterChips } from '@/components/pro/filter-chips';
import { FilterMenu } from '@/components/pro/filter-menu/FilterMenu';
import { FullscreenSurface } from '@/components/pro/FullscreenSurface';
import { ListChrome } from '@/components/pro/ListChrome';
import { SearchField } from '@/components/pro/SearchField';
import { useColumnPreferences } from '@/components/pro/use-column-preferences';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldDescription, FieldError } from '@/components/ui/field';
import { columnSettingsLabels } from '@/lib/list-labels';
import { useSearchDraft } from '@/lib/use-search-draft';
import { actorsQuery, operationsQuery, OperationQuerySchema, type OperationQuery } from '../api';
import { AuditRange } from '../components/AuditRange';
import { OperationDrawer } from '../detail/OperationDrawer';
import { auditError, operationFilterPatch, operationFilterRoot } from '../model';
import { operationColumns } from './operationColumns';
import { useOperationFilterFields } from './useOperationFilterFields';

export function OperationScene({
  search,
  onSearchChange,
}: {
  search: OperationQuery;
  onSearchChange: (patch: Partial<OperationQuery>) => void;
}) {
  const { t } = useTranslation('admin');
  const [draft, setDraft] = useSearchDraft(search.objectId ?? '', (next) =>
    onSearchChange({ objectId: next || undefined, page: 1 }),
  );
  const { t: tc } = useTranslation('common');
  const actors = useQuery(actorsQuery({ from: search.from, to: search.to }));
  const [fullscreen, setFullscreen] = useState(false);
  const result = useQuery(operationsQuery(search));
  const [id, selectDetail] = useState<string | null>(null);
  const valid = OperationQuerySchema.safeParse(search).success;
  const change = (patch: Partial<OperationQuery>) => onSearchChange({ ...patch, page: 1 });

  const columns = operationColumns(t, {
    onFilterActor: (actorId) => change({ actorId }),
    onOpenDetail: selectDetail,
  });

  const active = Object.entries(search).filter(
    ([key, value]) => !['page', 'pageSize', 'from', 'to'].includes(key) && value,
  );

  const empty = active.length
    ? t('audit.filteredEmpty', {
        filters: active
          .map(([key, value]) => `${t(`audit.filterNames.${key}`)}: ${String(value)}`)
          .join(' · '),
      })
    : t('audit.rangeEmpty');

  const { prefs, setPrefs, resetPrefs, columnState, columnItems, setColumns } = useColumnPreferences(
    'admin.audit.operations',
    columns,
    { density: 'relaxed' },
  );

  const filters = operationFilterRoot(search);
  const { fields, panelLabels } = useOperationFilterFields(actors.data ?? []);

  const body = (
    <>
      <ListChrome
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              aria-label={t('audit.objectIdSearch')}
              placeholder={t('audit.objectIdSearch')}
              value={draft}
              containerClassName="w-[calc(220px*var(--app-scale))]"
              onChange={(e) => setDraft(e.target.value)}
            />
            <AuditRange from={search.from} to={search.to} onChange={change} />
            <FilterMenu
              fields={fields}
              value={filters}
              onChange={(root) => change(operationFilterPatch(root))}
              operatorLabels={{ eq: t('audit.equals') }}
              activeCount={chipCount(filters)}
              labels={{
                trigger: t('audit.filters'),
                searchPlaceholder: t('audit.filterSearch'),
                schemesTitle: t('audit.schemes'),
                fieldsTitle: t('audit.fields'),
                advanced: t('audit.advanced'),
                conditionCount: (count) => t('audit.conditionCount', { count }),
                commitHint: tc('list.filters.commitHint'),
              }}
              panelLabels={panelLabels}
            />

            <span className="flex-1" />
            <ToolbarIconActions
              labels={{
                refresh: t('audit.refresh'),
                fullscreen: tc('table.fullscreen'),
                exitFullscreen: tc('table.exitFullscreen'),
              }}
              onRefresh={valid ? () => result.refetch() : undefined}
              refreshing={result.isFetching}
              fullscreen={{ active: fullscreen, onToggle: () => setFullscreen((open) => !open) }}
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
          </div>
        }
        filters={
          chipCount(filters) > 0 ? (
            <FilterChips
              value={filters}
              fields={fields}
              onChange={(root) => change(operationFilterPatch(root))}
              onClear={() => change(operationFilterPatch({ op: 'and', items: [] }))}
              panelLabels={panelLabels}
              labels={{
                advanced: t('audit.advanced'),
                clear: t('audit.clear'),
                modified: tc('list.filters.modified'),
                save: tc('list.filters.save'),
                saveAs: tc('list.filters.saveAs'),
                more: (count) => tc('list.filters.more', { count }),
                collapse: tc('list.filters.collapse'),
                removeCondition: (label) => t('audit.removeCondition', { label }),
                schemesTitle: t('audit.schemes'),
                manageSchemes: tc('list.filters.manageSchemes'),
                includeSub: tc('list.filters.includeSub'),
                operators: { eq: t('audit.equals') },
              }}
            />
          ) : undefined
        }
      />
      {actors.isError && (
        <Alert variant="destructive">
          <AlertDescription>{auditError(actors.error, t('audit.actorsFailed'))}</AlertDescription>
          <Button variant="link" onClick={() => void actors.refetch()}>
            {t('audit.retry')}
          </Button>
        </Alert>
      )}
      {!valid ? (
        <div className="px-5">
          <FieldError role="alert">{t('audit.invalidRange')}</FieldError>
        </div>
      ) : (
        <>
          <div className="px-5 pb-2">
            <FieldDescription>{t('audit.rangeHint')}</FieldDescription>
          </div>
          <DataTable
            columns={columns}
            data={result.data?.list ?? []}
            rowKey={(row) => row.id}
            columnState={columnState}
            onColumnStateChange={setPrefs}
            density={prefs.density}
            loading={result.isPending}
            loadingText={t('audit.loading')}
            error={result.isError}
            errorText={auditError(result.error, t('audit.loadFailed'))}
            onRetry={() => void result.refetch()}
            retryText={t('audit.retry')}
            emptyText={empty}
            onRowClick={(row) => selectDetail(row.id)}
            pagination={{
              page: search.page,
              pageCount: Math.max(1, Math.ceil((result.data?.total ?? 0) / search.pageSize)),
              total: result.data?.total ?? 0,
              totalLabel: t('audit.total', { count: result.data?.total ?? 0 }),
              prevLabel: t('audit.prev'),
              nextLabel: t('audit.next'),
              currentLabel: t('audit.current', { page: search.page }),
              onPageChange: (page) => onSearchChange({ page }),
            }}
          />
        </>
      )}
    </>
  );

  return (
    <>
      {fullscreen ? (
        <FullscreenSurface
          title={t('audit.tabs.oplog')}
          subtitle={t('audit.total', { count: result.data?.total ?? 0 })}
          exitLabel={tc('table.exitFullscreen')}
          escHint={tc('table.escToExit')}
          onExit={() => setFullscreen(false)}
        >
          {body}
        </FullscreenSurface>
      ) : (
        body
      )}
      {id && (
        <OperationDrawer
          id={id}
          onClose={() => selectDetail(null)}
          onOpenRelated={(relatedId) => selectDetail(relatedId)}
        />
      )}
    </>
  );
}
