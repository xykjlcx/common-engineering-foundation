import { useState } from 'react';
import { ColumnSettings } from '@/components/pro/ColumnSettings';
import { ToolbarIconActions } from '@/components/pro/DataToolbar';
import { FullscreenSurface } from '@/components/pro/FullscreenSurface';
import { useColumnPreferences } from '@/components/pro/use-column-preferences';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/pro/DataTable';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { ListChrome } from '@/components/pro/ListChrome';
import { SearchField } from '@/components/pro/SearchField';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FieldError, FieldDescription } from '@/components/ui/field';
import { loginsQuery, LoginQuerySchema, type LoginQuery, type LoginDto } from '../api';
import { auditError, formatAuditTime, defaultAuditRange } from '../model';
import { AuditRange } from '../components/AuditRange';
import { useSearchDraft } from '@/lib/use-search-draft';
import { columnSettingsLabels } from '@/lib/list-labels';

export function LoginScene({
  search,
  onSearchChange,
}: {
  search: LoginQuery;
  onSearchChange: (patch: Partial<LoginQuery>) => void;
}) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [fullscreen, setFullscreen] = useState(false);
  const [draft, setDraft] = useSearchDraft(search.username ?? '', (next) =>
    onSearchChange({ username: next || undefined, page: 1 }),
  );
  const result = useQuery(loginsQuery(search));
  const valid = LoginQuerySchema.safeParse(search).success;
  const change = (patch: Partial<LoginQuery>) => onSearchChange({ ...patch, page: 1 });

  const columns: ColumnDef<LoginDto>[] = [
    {
      id: 'time',
      header: t('audit.time'),
      size: 195,
      cell: ({ row }) => (
        <TableText className="block" mono>
          {formatAuditTime(row.original.occurredAt)}
        </TableText>
      ),
    },
    {
      id: 'username',
      header: t('audit.username'),
      size: 180,
      cell: ({ row }) => (
        <TableText className="block" tone="strong">
          {row.original.username}
        </TableText>
      ),
    },
    {
      id: 'ip',
      header: t('audit.ip'),
      size: 160,
      cell: ({ row }) => (
        <TableText className="block" mono>
          {row.original.ip ?? '—'}
        </TableText>
      ),
    },
    {
      id: 'device',
      header: t('audit.device'),
      size: 320,
      cell: ({ row }) => (
        <TableText className="block" title={row.original.ua ?? ''}>
          {row.original.ua ?? '—'}
        </TableText>
      ),
    },
    {
      id: 'outcome',
      header: t('audit.outcome'),
      size: 100,
      cell: ({ row }) => (
        <StatusBadge tone={row.original.outcome === 'success' ? 'success' : 'danger'}>
          {t(`audit.loginOutcomes.${row.original.outcome}`)}
        </StatusBadge>
      ),
    },
    {
      id: 'reason',
      header: t('audit.reason'),
      size: 220,
      cell: ({ row }) => (
        <TableText className="block" tone={row.original.outcome === 'success' ? 'body' : 'danger'}>
          {row.original.reason
            ? t(`audit.reasons.${row.original.reason}`, { defaultValue: row.original.reason })
            : '—'}
        </TableText>
      ),
    },
  ];

  const filters = [
    search.username && `${t('audit.username')}: ${search.username}`,
    search.ip && `${t('audit.ip')}: ${search.ip}`,
    search.outcome && t(`audit.loginOutcomes.${search.outcome}`),
  ]
    .filter(Boolean)
    .join(' · ');

  const { prefs, setPrefs, resetPrefs, columnState, columnItems, setColumns } = useColumnPreferences(
    'admin.audit.logins',
    columns,
    { density: 'relaxed' },
  );

  const body = (
    <>
      <ListChrome
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              aria-label={t('audit.username')}
              placeholder={t('audit.username')}
              value={draft}
              containerClassName="w-[calc(200px*var(--app-scale))]"
              onChange={(e) => setDraft(e.target.value)}
            />
            <Input
              className="w-[calc(150px*var(--app-scale))]"
              aria-label={t('audit.ip')}
              placeholder={t('audit.ip')}
              value={search.ip ?? ''}
              onChange={(e) => change({ ip: e.target.value || undefined })}
            />
            <AuditRange from={search.from} to={search.to} onChange={change} />
            <SelectControl
              className="w-[calc(125px*var(--app-scale))]"
              aria-label={t('audit.outcome')}
              value={search.outcome ?? ''}
              options={['', 'success', 'failure', 'locked'].map((value) => ({
                value,
                label: value ? t(`audit.loginOutcomes.${value}`) : t('audit.allOutcomes'),
              }))}
              onValueChange={(value) =>
                change({ outcome: LoginQuerySchema.shape.outcome.parse(value || undefined) })
              }
            />
            <Button
              variant="secondary"
              onClick={() =>
                onSearchChange({
                  ...defaultAuditRange(),
                  page: 1,
                  username: undefined,
                  ip: undefined,
                  outcome: undefined,
                })
              }
            >
              {t('audit.clear')}
            </Button>
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
      />
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
            emptyText={filters ? t('audit.filteredEmpty', { filters }) : t('audit.rangeEmpty')}
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

  return fullscreen ? (
    <FullscreenSurface
      title={t('audit.tabs.login')}
      subtitle={t('audit.total', { count: result.data?.total ?? 0 })}
      exitLabel={tc('table.exitFullscreen')}
      escHint={tc('table.escToExit')}
      onExit={() => setFullscreen(false)}
    >
      {body}
    </FullscreenSurface>
  ) : (
    body
  );
}
