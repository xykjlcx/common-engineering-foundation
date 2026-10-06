import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { DataTableRowActions } from '@/components/pro/DataTableRowActions';
import { ListChrome, ListPageHeader, ListToolbar } from '@/components/pro/ListChrome';
import { SearchField } from '@/components/pro/SearchField';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { ColumnSettings } from '@/components/pro/ColumnSettings';
import { ToolbarIconActions } from '@/components/pro/DataToolbar';
import { FullscreenSurface } from '@/components/pro/FullscreenSurface';
import { Button } from '@/components/ui/button';
import { authzContext, matchPermission } from '@/lib/permission';
import { BizError } from '@/lib/http/errors';
import { useColumnPreferences } from '@/components/pro/use-column-preferences';
import { dictItemsQuery, dictTypeQuery, dictKeys, type DictItem } from '../api';
import { dictError } from '../model';
import type { DictPageProps, DictDialog } from '../types';
import { DictTypeDialog } from '../form/DictTypeDialog';
import { DictItemDialog } from '../form/DictItemDialog';
import { DictDeleteDialog } from '../detail/DictDeleteDialog';
import { useSearchDraft } from '@/lib/use-search-draft';
import { columnSettingsLabels } from '@/lib/list-labels';

export function DictItemsScene({
  typeId,
  search,
  permissions,
  systemAdmin,
  onSearchChange,
}: DictPageProps & { typeId: string }) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const client = useQueryClient();
  const type = useQuery(dictTypeQuery(typeId));

  const result = useQuery(
    dictItemsQuery({ typeId, keyword: search.keyword, page: search.page, pageSize: search.pageSize }),
  );

  const [dialog, setDialog] = useState<DictDialog | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [draft, setDraft] = useSearchDraft(search.keyword, (next) =>
    onSearchChange({ keyword: next, page: 1 }),
  );
  const authz = authzContext(permissions, systemAdmin);
  const canCreate = matchPermission(authz, 'sys:dict:create');
  const canUpdate = matchPermission(authz, 'sys:dict:update');
  const canDelete = matchPermission(authz, 'sys:dict:delete');

  const columns: ColumnDef<DictItem>[] = [
    {
      id: 'value',
      header: t('dicts.value'),
      size: 120,
      cell: ({ row }) => (
        <TableText mono className="block" title={row.original.value}>
          {row.original.value}
        </TableText>
      ),
    },
    {
      id: 'label',
      header: t('dicts.label'),
      size: 220,
      cell: ({ row }) => (
        <TableText tone="strong" className="block" title={row.original.label}>
          {row.original.label}
        </TableText>
      ),
    },
    {
      id: 'tone',
      header: t('dicts.tone'),
      size: 220,
      cell: ({ row }) => (
        <StatusBadge tone={row.original.tone} className="max-w-full">
          <span className="truncate">{row.original.label}</span>
        </StatusBadge>
      ),
    },
    {
      id: 'sort',
      size: 75,
      header: t('dicts.sort'),
      cell: ({ row }) => <TableText>{row.original.sort}</TableText>,
    },
    {
      id: 'isDefault',
      header: t('dicts.default'),
      size: 70,
      cell: ({ row }) => (row.original.isDefault ? <TableText>{t('dicts.default')}</TableText> : null),
    },
    {
      id: 'remark',
      header: t('dicts.remark'),
      cell: ({ row }) => (
        <TableText className="block" title={row.original.remark}>
          {row.original.remark}
        </TableText>
      ),
    },
    {
      id: 'enabled',
      header: t('dicts.enabled'),
      size: 80,
      cell: ({ row }) => (
        <StatusBadge tone={row.original.enabled ? 'success' : 'neutral'}>
          {t(row.original.enabled ? 'dicts.enabled' : 'dicts.disabled')}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: t('dicts.actions'),
      size: 110,
      cell: ({ row }) => (
        <DataTableRowActions
          overflowLabel={t('dicts.more')}
          actions={[
            ...(canUpdate
              ? [
                  {
                    id: 'edit',
                    label: t('dicts.edit'),
                    onSelect: () => setDialog({ kind: 'editItem', id: row.original.id }),
                  },
                ]
              : []),
            ...(canDelete
              ? [
                  {
                    id: 'delete',
                    label: row.original.builtin ? t('dicts.builtin') : t('dicts.delete'),
                    disabled: row.original.builtin,
                    onSelect: () => setDialog({ kind: 'deleteItem', id: row.original.id }),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  const { prefs, setPrefs, resetPrefs, columnState, columnItems, setColumns } = useColumnPreferences(
    'admin.dicts',
    columns,
    { density: 'relaxed' },
  );

  const total = result.data?.total ?? 0;
  const traceId = result.error instanceof BizError ? result.error.traceId : undefined;

  const body = (
    <>
      <div className="px-5 pt-3">
        <ListPageHeader
          title={type.data?.name ?? t('dicts.title')}
          count={type.data?.code}
          actions={
            <>
              {canUpdate && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDialog({ kind: 'editType', id: typeId })}
                >
                  {t('dicts.editType')}
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!type.data || type.data.builtin}
                  title={type.data?.builtin ? t('dicts.builtin') : undefined}
                  onClick={() => setDialog({ kind: 'deleteType', id: typeId })}
                >
                  {t('dicts.delete')}
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => setDialog({ kind: 'createItem', typeId })}>
                  {t('dicts.createItem')}
                </Button>
              )}
            </>
          }
        />
        {type.data?.remark && (
          <TableText tone="weak" className="mt-1 block">
            {type.data.remark}
          </TableText>
        )}
      </div>
      <ListChrome
        toolbar={
          <ListToolbar
            leading={
              <>
                <SearchField
                  aria-label={t('dicts.search')}
                  placeholder={t('dicts.search')}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                {search.keyword && (
                  <Button size="sm" variant="ghost" onClick={() => onSearchChange({ keyword: '', page: 1 })}>
                    {t('dicts.clear')}
                  </Button>
                )}
                <ToolbarIconActions
                  onRefresh={() => client.invalidateQueries({ queryKey: dictKeys.all })}
                  refreshing={result.isFetching}
                  fullscreen={{ active: fullscreen, onToggle: () => setFullscreen((value) => !value) }}
                  labels={{
                    refresh: tc('table.refresh'),
                    fullscreen: tc('table.fullscreen'),
                    exitFullscreen: tc('table.exitFullscreen'),
                  }}
                >
                  <ColumnSettings
                    columns={columnItems}
                    onColumnsChange={setColumns}
                    density={prefs.density}
                    onDensityChange={(density) => setPrefs({ density })}
                    onReset={resetPrefs}
                    labels={columnSettingsLabels(tc)}
                  />
                </ToolbarIconActions>
              </>
            }
          />
        }
        filters={
          result.isError ? (
            <TableText role="alert" tone="danger">
              {dictError(result.error, t)} {traceId}
            </TableText>
          ) : undefined
        }
      />
      <DataTable
        columns={columns}
        data={result.data?.list ?? []}
        rowKey={(row) => row.id}
        loading={result.isPending}
        loadingText={t('dicts.loading')}
        error={result.isError}
        errorText={t('dicts.errors.failed')}
        retryText={t('dicts.retry')}
        onRetry={() => void result.refetch()}
        emptyText={t(search.keyword ? 'dicts.noMatch' : 'dicts.emptyItems', { keyword: search.keyword })}
        columnState={columnState}
        onColumnStateChange={setPrefs}
        density={prefs.density}
        busy={result.isFetching && !result.isPending}
        pagination={{
          page: search.page,
          pageCount: Math.max(1, Math.ceil(total / search.pageSize)),
          total,
          totalLabel: t('dicts.total', { count: total }),
          prevLabel: t('dicts.previous'),
          nextLabel: t('dicts.next'),
          currentLabel: t('dicts.page', { page: search.page }),
          onPageChange: (page) => onSearchChange({ page }),
          pageSize: {
            value: search.pageSize,
            options: [15, 30, 50, 100],
            ariaLabel: t('dicts.pageSizeLabel'),
            label: (size) => t('dicts.pageSize', { size }),
            onChange: (pageSize) => onSearchChange({ pageSize, page: 1 }),
          },
        }}
      />
    </>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {fullscreen ? (
        <FullscreenSurface
          title={t('dicts.title')}
          escHint={tc('table.escToExit')}
          exitLabel={tc('table.exitFullscreen')}
          onExit={() => setFullscreen(false)}
        >
          {body}
        </FullscreenSurface>
      ) : (
        body
      )}
      {dialog?.kind === 'editType' && <DictTypeDialog id={dialog.id} onClose={() => setDialog(null)} />}
      {(dialog?.kind === 'createItem' || dialog?.kind === 'editItem') && (
        <DictItemDialog
          id={dialog.kind === 'editItem' ? dialog.id : undefined}
          typeId={typeId}
          onClose={() => setDialog(null)}
        />
      )}
      {(dialog?.kind === 'deleteType' || dialog?.kind === 'deleteItem') && (
        <DictDeleteDialog
          kind={dialog.kind === 'deleteType' ? 'type' : 'item'}
          id={dialog.id}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
