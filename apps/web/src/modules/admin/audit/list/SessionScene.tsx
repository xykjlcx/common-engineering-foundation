import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/pro/DataTable';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { ListChrome } from '@/components/pro/ListChrome';
import { SearchField } from '@/components/pro/SearchField';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { ColumnSettings } from '@/components/pro/ColumnSettings';
import { ToolbarIconActions } from '@/components/pro/DataToolbar';
import { FullscreenSurface } from '@/components/pro/FullscreenSurface';
import { useColumnPreferences } from '@/components/pro/use-column-preferences';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FieldDescription } from '@/components/ui/field';
import { authzContext, matchPermission } from '@/lib/permission';
import { sessionsQuery, revokeSession, auditKeys, type SessionQuery, type OnlineSessionDto } from '../api';
import { auditError, formatAuditTime, sessionDevice } from '../model';
import { useSearchDraft } from '@/lib/use-search-draft';
import { columnSettingsLabels } from '@/lib/list-labels';

export function SessionScene({
  search,
  onSearchChange,
  permissions,
  systemAdmin,
}: {
  search: SessionQuery;
  onSearchChange: (patch: Partial<SessionQuery>) => void;
  permissions: string[];
  systemAdmin: boolean;
}) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const client = useQueryClient();
  const canRevoke = matchPermission(authzContext(permissions, systemAdmin), 'audit:session:revoke');
  const [fullscreen, setFullscreen] = useState(false);
  const [draft, setDraft] = useSearchDraft(search.keyword ?? '', (next) =>
    onSearchChange({ keyword: next || undefined, page: 1 }),
  );
  const result = useQuery(sessionsQuery(search));
  const [target, chooseTarget] = useState<string | null>(null);
  const targetRow = result.data?.list.find((row) => row.handle === target);

  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: async () => {
      chooseTarget(null);

      await Promise.all([
        client.invalidateQueries({ queryKey: auditKeys.sessionLists() }),
        client.invalidateQueries({ queryKey: auditKeys.operationLists() }),
      ]);
    },
  });

  const columns: ColumnDef<OnlineSessionDto>[] = [
    {
      id: 'user',
      header: t('audit.sessions.user'),
      size: 200,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-[calc(22px*var(--app-scale))]">
            <AvatarFallback>{row.original.userName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <TableText className="block" tone="strong">
              {row.original.userName}
            </TableText>
            <TableText className="block" tone="weak" mono>
              {row.original.employeeNo ?? '—'}
            </TableText>
          </div>
        </div>
      ),
    },
    {
      id: 'ip',
      header: t('audit.ip'),
      size: 140,
      cell: ({ row }) => (
        <TableText className="block" mono>
          {row.original.ip ?? '—'}
        </TableText>
      ),
    },
    {
      id: 'device',
      header: t('audit.device'),
      size: 190,
      cell: ({ row }) => (
        <TableText className="block" title={row.original.ua ?? ''}>
          {sessionDevice(row.original.ua) ?? t('audit.sessions.unknownDevice')}
        </TableText>
      ),
    },
    {
      id: 'createdAt',
      header: t('audit.sessions.createdAt'),
      size: 195,
      cell: ({ row }) => (
        <TableText className="block" mono>
          {formatAuditTime(row.original.createdAt)}
        </TableText>
      ),
    },
    {
      id: 'lastActiveAt',
      header: t('audit.sessions.activeAt'),
      size: 195,
      cell: ({ row }) => (
        <TableText className="block" mono>
          {formatAuditTime(row.original.lastActiveAt)}
        </TableText>
      ),
    },
    {
      id: 'kind',
      header: t('audit.sessions.kind'),
      size: 195,
      cell: ({ row }) => (
        <div className="grid gap-1">
          <div className="flex flex-wrap gap-1">
            <StatusBadge tone={row.original.kind === 'impersonation' ? 'warning' : 'neutral'}>
              {t(`audit.sessions.${row.original.kind}`)}
            </StatusBadge>
            {row.original.current && <StatusBadge tone="info">{t('audit.sessions.current')}</StatusBadge>}
          </div>
          {row.original.impersonatorName && (
            <TableText className="block" tone="weak">
              {t('audit.sessions.impersonator', { name: row.original.impersonatorName })}
            </TableText>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: t('audit.action'),
      size: 140,
      enableHiding: false,
      cell: ({ row }) =>
        row.original.current ? (
          <TableText className="block" tone="weak" title={t('audit.sessions.logoutHint')}>
            {t('audit.sessions.current')}
          </TableText>
        ) : canRevoke ? (
          // 行内只放中性按钮，避免整列红框；后果说明与危险色交给确认对话框
          <Button
            variant="ghost"
            size="sm"
            disabled={revoke.isPending}
            onClick={() => {
              revoke.reset();
              chooseTarget(row.original.handle);
            }}
          >
            {t('audit.sessions.revoke')}
          </Button>
        ) : null,
    },
  ];

  const { prefs, setPrefs, resetPrefs, columnState, columnItems, setColumns } = useColumnPreferences(
    'admin.audit.sessions',
    columns,
    { density: 'loose' },
  );

  const body = (
    <>
      <ListChrome
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              aria-label={t('audit.sessions.search')}
              placeholder={t('audit.sessions.search')}
              value={draft}
              containerClassName="w-[calc(230px*var(--app-scale))]"
              onChange={(e) => setDraft(e.target.value)}
            />
            <span className="flex-1" />
            <ToolbarIconActions
              labels={{
                refresh: t('audit.refresh'),
                fullscreen: tc('table.fullscreen'),
                exitFullscreen: tc('table.exitFullscreen'),
              }}
              onRefresh={() => result.refetch()}
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
      <div className="px-5 pb-2">
        <FieldDescription>{t('audit.sessions.activeHint')}</FieldDescription>
        {result.data?.onlyOwn && <FieldDescription>{t('audit.sessions.onlyOwn')}</FieldDescription>}
      </div>
      <DataTable
        columns={columns}
        data={result.data?.list ?? []}
        rowKey={(row) => row.handle}
        columnState={columnState}
        onColumnStateChange={setPrefs}
        density={prefs.density}
        loading={result.isPending}
        loadingText={t('audit.sessions.loading')}
        error={result.isError}
        errorText={auditError(result.error, t('audit.sessions.loadFailed'))}
        onRetry={() => void result.refetch()}
        retryText={t('audit.retry')}
        emptyText={
          search.keyword
            ? t('audit.sessions.filteredEmpty', { keyword: search.keyword })
            : t('audit.sessions.empty')
        }
        pagination={{
          page: search.page,
          pageCount: Math.max(1, Math.ceil((result.data?.total ?? 0) / search.pageSize)),
          total: result.data?.total ?? 0,
          totalLabel: t('audit.sessions.total', { count: result.data?.total ?? 0 }),
          prevLabel: t('audit.prev'),
          nextLabel: t('audit.next'),
          currentLabel: t('audit.current', { page: search.page }),
          onPageChange: (page) => onSearchChange({ page }),
        }}
      />
      <div className="px-5 py-2">
        <FieldDescription>{t('audit.sessions.footer')}</FieldDescription>
      </div>
    </>
  );

  return (
    <>
      {fullscreen ? (
        <FullscreenSurface
          title={t('audit.tabs.sessions')}
          subtitle={t('audit.sessions.total', { count: result.data?.total ?? 0 })}
          exitLabel={tc('table.exitFullscreen')}
          escHint={tc('table.escToExit')}
          onExit={() => setFullscreen(false)}
        >
          {body}
        </FullscreenSurface>
      ) : (
        body
      )}
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) chooseTarget(null);
        }}
        title={t('audit.sessions.confirmTitle')}
        description={t('audit.sessions.confirmDescription', {
          name: targetRow?.userName ?? '',
          device: sessionDevice(targetRow?.ua ?? null) ?? t('audit.sessions.unknownDevice'),
        })}
        confirmText={t('audit.sessions.revoke')}
        cancelText={t('audit.sessions.cancel')}
        pending={revoke.isPending}
        error={revoke.isError ? auditError(revoke.error, t('audit.sessions.revokeFailed')) : undefined}
        onConfirm={async () => {
          if (target) await revoke.mutateAsync(target);
        }}
      />
    </>
  );
}
