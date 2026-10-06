import { PasswordResetResults } from '../components/PasswordResetResults';
import { UsersMoveDialog } from '../components/UsersMoveDialog';
import { UserEmploymentDialog } from '../components/UserEmploymentDialog';
import { UsersRolesDialog } from '../components/UsersRolesDialog';
import { useCallback, useMemo, useState, type JSX } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { DataTable } from '@/components/pro/DataTable';
import { chipCount, type FilterRoot } from '@/components/pro/filter-builder';
import { FloatingActionBar } from '@/components/pro/FloatingActionBar';
import { FullscreenSurface } from '@/components/pro/FullscreenSurface';
import { ListChrome } from '@/components/pro/ListChrome';
import { PermissionAction } from '@/components/pro/PermissionAction';
import { useLastSuccessfulData } from '@/components/pro/use-last-successful-data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BizError } from '@/lib/http/errors';
import { authzContext, matchPermission } from '@/lib/permission';
import { userDeptTreeQuery as deptTreeQuery, userRolesQuery as rolesQuery } from '../api/dictionaries';
import { useColumnPreferences } from '@/components/pro/use-column-preferences';
import {
  filterSchemesQuery,
  useUserMutations,
  userKeys,
  usersQuery,
  type UserDto,
  type UsersQueryParams,
} from '../api';
import {
  hasLegacyPositionFilter,
  migratePositionColumn,
  parseFilters,
  parseSort,
  stringifyFilters,
  stringifySort,
} from '../model';
import type { ResetPasswordOutcome, UserActionTarget, UsersSearch } from '../types';
import { userColumns } from './columns';
import { userRowMenu } from './rowMenu';
import { SaveSchemeDialog } from './SaveSchemeDialog';
import { UsersFirstUse, UsersNoResult } from './UsersEmptyStates';
import { UsersExportMenu } from './UsersExportMenu';
import { UsersFilterChips } from './UsersFilterChips';
import { UsersDeptPanel } from './UsersDeptPanel';
import { UsersFilterDialog } from './UsersFilterDialog';
import { UsersToolbar } from './UsersToolbar';

/* 状态归属（CLAUDE.md「最近公共父」）：行选择被批量条、表格、以及「筛选变化要清空选择」三方消费， 故住在本场景；服务端分页与筛选住 URL search，DataTable 使用受控分页协议。 */

const emptyUsersPage = { list: [], total: 0 };
const closedAction: UserActionTarget = { kind: 'closed' };

export function UsersScene({
  permissions,
  systemAdmin = false,
  search,
  onSearchChange,
  onOpenUser,
  onCreateUser,
  onEditUser,
}: {
  permissions: string[];
  systemAdmin?: boolean;
  search: UsersSearch;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
  onOpenUser: (userId: string) => void;
  onCreateUser: () => void;
  onEditUser: (userId: string) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  // 刷新 / 全屏是通用表格动作，文案住 common namespace
  const { t: tCommon } = useTranslation('common');
  const queryClient = useQueryClient();
  const authz = authzContext(permissions, systemAdmin);
  const usersResult = useQuery(usersQuery(search));
  const { data: depts } = useQuery(deptTreeQuery);
  const { data: roles } = useQuery(rolesQuery);
  const schemesResult = useQuery(filterSchemesQuery);
  const schemes = schemesResult.data ?? [];
  const mutations = useUserMutations();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [action, storeAction] = useState<UserActionTarget>(closedAction);
  const [resetOutcome, setResetOutcome] = useState<ResetPasswordOutcome | null>(null);
  const [savingScheme, setSavingScheme] = useState(false);
  const [schemeFilters, setSchemeFilters] = useState('');
  const [advanced, setAdvanced] = useState<{ open: boolean; focus?: string }>({ open: false });
  // 全屏只是把「工具条 + 表格」提到 fixed 层，行选择 / 筛选 / 分页仍是本场景与 URL 的状态
  const [fullscreen, setFullscreen] = useState(false);

  // search 变化（翻页 / 改筛选 / 排序）时清空行选择：用渲染期同步 setState 而不是整场景 remount，
  // 避免 keepPreviousData 失效与表格 DOM 重建。
  const searchKey = JSON.stringify(search);
  const [prevSearchKey, setPrevSearchKey] = useState(searchKey);
  if (searchKey !== prevSearchKey) {
    setPrevSearchKey(searchKey);
    setRowSelection({});
  }

  // D21：换 key 请求失败时 keepPreviousData 不再顶位（data 变 undefined），
  // 靠 useLastSuccessfulData 把上一份成功数据留住，才走得到「旧行减淡 + 顶部通条」。
  const previousPage = useLastSuccessfulData(usersResult.data);
  const legacyFilter = hasLegacyPositionFilter(search.filters);
  const usersPage = legacyFilter ? emptyUsersPage : (previousPage ?? emptyUsersPage);
  const usersUpdatedAt = useLastSuccessfulData(usersResult.dataUpdatedAt || undefined) ?? 0;
  const pageCount = Math.max(1, Math.ceil(usersPage.total / search.pageSize));
  const roleNameById = useMemo(() => new Map(roles?.map((role) => [role.id, role.name])), [roles]);
  const filters = parseFilters(search.filters);
  const filterCount = chipCount(filters);
  const hasQuery = filterCount > 0 || search.keyword !== '';
  // 相对时间随成功刷新更新，选择等 UI 状态不重建列与 cell 函数组件。
  const now = useMemo(() => new Date(usersUpdatedAt), [usersUpdatedAt]);
  const totalLabel = hasQuery
    ? t('users.pagination.filteredTotal', { count: usersPage.total })
    : t('users.countPeople', { count: usersPage.total });
  const columns = useMemo(
    () => userColumns({ t, now, depts: depts ?? [], roleNameById, search }),
    [t, now, depts, roleNameById, search],
  );
  const { prefs, setPrefs, resetPrefs, columnState, columnItems, setColumns } = useColumnPreferences(
    'admin.users',
    columns,
    { density: 'default', migrate: migratePositionColumn },
  );
  const activeScheme = schemes.find((item) => item.id === search.schemeId);
  const showChips = filterCount > 0 || !!activeScheme;
  // schemeId 悬空（方案已删 / 链接来自别人）：先视同无方案，再在下一次 search 变更时顺手把参数删掉。

  const schemeDangling = schemesResult.isSuccess && !!search.schemeId && !activeScheme;
  // 必须 memo：UsersToolbar 的 250ms 搜索防抖把它挂在 effect deps 上，
  // 身份每渲染变一次就永远等不到定时器触发。schemeDangling 极少翻转，重建代价可忽略。
  const changeSearch = useCallback(
    (patch: Partial<UsersQueryParams>) => {
      onSearchChange(schemeDangling ? { schemeId: undefined, ...patch } : patch);
    },
    [onSearchChange, schemeDangling],
  );

  const applyFilters = (next: FilterRoot) => {
    changeSearch({ filters: stringifyFilters(next) || undefined, page: 1 });
    setAdvanced({ open: false });
  };
  const applyScheme = (id: string) => {
    const scheme = schemes.find((item) => item.id === id);
    if (!scheme) return;
    changeSearch({ filters: scheme.filters, schemeId: id, page: 1 });
  };
  const clearFilters = () => {
    changeSearch({ filters: undefined, schemeId: undefined, page: 1 });
  };
  const openSaveScheme = (nextFilters: string) => {
    setSchemeFilters(nextFilters);
    setSavingScheme(true);
  };

  const canCreate = matchPermission(authz, 'iam:user:create');
  const canExport = matchPermission(authz, 'iam:user:export');
  const canDisable = matchPermission(authz, 'iam:user:change_status');
  const canDelete = matchPermission(authz, 'iam:user:delete');
  const canAssignRoles = matchPermission(authz, 'iam:user:assign_roles');
  const canResetPassword = matchPermission(authz, 'iam:user:reset_password');

  const onRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    setRowSelection((current) => (typeof updater === 'function' ? updater(current) : updater));
  };
  const clearSelection = () => setRowSelection({});
  const rowSelectAriaLabel = (user: UserDto) => t('users.selectUser', { name: user.name });

  const rowMenu = (user: UserDto) =>
    userRowMenu(user, {
      t,
      authz,
      actions: {
        onView: (target) => onOpenUser(target.id),
        onEdit: (target) => onEditUser(target.id),
        onResetPassword: (target) =>
          setAction({ kind: 'resetPassword', ids: [target.id], name: target.name }),
        onAssignRoles: (target) => setAction({ kind: 'assignRoles', ids: [target.id] }),
        onToggleEnabled: (target) =>
          setAction({
            kind: target.enabled ? 'disable' : 'enable',
            ids: [target.id],
            name: target.name,
          }),
        onChangeEmployment: (target) =>
          setAction({ kind: 'employment', ids: [target.id], name: target.name }),
        onDelete: (target) => setAction({ kind: 'delete', ids: [target.id], name: target.name }),
      },
    });

  const setAction = (next: UserActionTarget) => {
    if (next.kind === 'closed') {
      storeAction(next);
      return;
    }
    const available = usersPage.list;
    const targets = next.ids.map((id) => {
      const row = available.find((user) => user.id === id);
      if (!row) throw new Error('user.not_found');
      return { id, version: row.version };
    });
    storeAction(
      next.kind === 'employment'
        ? { ...next, targets, employmentStatus: available.find((user) => user.id === next.ids[0])?.status }
        : { ...next, targets },
    );
  };

  const runAction = async () => {
    if (action.kind === 'closed') return;
    if (action.kind === 'delete') await mutations.batchDelete.mutateAsync(action.targets ?? []);
    if (action.kind === 'disable') await mutations.batchDisable.mutateAsync(action.targets ?? []);
    if (action.kind === 'enable') await mutations.batchEnable.mutateAsync(action.targets ?? []);
    if (action.kind === 'resetPassword') {
      const result = await mutations.batchResetPassword.mutateAsync(action.targets ?? []);
      setResetOutcome(result);
      mutations.batchResetPassword.reset();
    }
    setAction(closedAction);
    clearSelection();
  };

  const actionPending =
    mutations.batchDelete.isPending ||
    mutations.batchDisable.isPending ||
    mutations.batchEnable.isPending ||
    mutations.batchResetPassword.isPending;

  const error = usersResult.error;
  const errorMessage =
    error instanceof BizError ? error.detail : error instanceof Error ? error.message : t('users.loadFailed');
  const traceId = error instanceof BizError ? (error.traceId ?? undefined) : undefined;

  // 全屏态与普通态渲染同一棵子树（只换外层容器）：切换会重挂表格，
  // 但分页 / 排序 / 筛选住 URL、行选择住本场景，切回来状态不丢。
  const listBody = (
    <>
      <ListChrome
        toolbar={
          <UsersToolbar
            search={search}
            onSearchChange={changeSearch}
            filters={filters}
            onFiltersChange={applyFilters}
            onOpenAdvanced={(id) => setAdvanced({ open: true, focus: id })}
            onApplyScheme={applyScheme}
            columnItems={columnItems}
            onColumnsChange={setColumns}
            density={prefs.density}
            onDensityChange={(density) => setPrefs({ density })}
            onResetColumns={resetPrefs}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: userKeys.all })}
            fullscreen={{ active: fullscreen, onToggle: () => setFullscreen((open) => !open) }}
            trailing={
              <>
                <UsersExportMenu
                  search={search}
                  filteredTotal={usersPage.total}
                  canExport={canExport}
                  canImport={matchPermission(authz, 'iam:user:import')}
                  columns={columnItems.filter((item) => item.visible).map((item) => item.id)}
                  selectedIds={Object.entries(rowSelection)
                    .filter(([, selected]) => selected)
                    .map(([id]) => id)}
                />
                <PermissionAction
                  allowed={canCreate}
                  degrade="disable"
                  reason={t('users.permission.noCreate')}
                >
                  <Button type="button" variant="primary" onClick={onCreateUser}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    {t('users.actions.create')}
                  </Button>
                </PermissionAction>
              </>
            }
          />
        }
        filters={
          showChips ? (
            <UsersFilterChips
              search={search}
              filters={filters}
              onFiltersChange={applyFilters}
              onOpenAdvanced={(id) => setAdvanced({ open: true, focus: id })}
              onApplyScheme={applyScheme}
              onSchemeDeleted={(id) => {
                if (search.schemeId === id) clearFilters();
              }}
              onClear={clearFilters}
              onSaveAs={() => openSaveScheme(stringifyFilters(filters))}
            />
          ) : undefined
        }
      />

      {legacyFilter && (
        <Alert variant="warning" role="alert">
          <AlertDescription>{t('users.filters.legacyPosition')}</AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        data={usersPage.list}
        rowKey={(user) => user.id}
        loading={usersResult.isPending && !legacyFilter}
        error={usersResult.isError && !legacyFilter}
        errorText={t('users.loadFailed')}
        retryText={t('users.retry')}
        onRetry={() => void usersResult.refetch()}
        emptyText={t('users.emptyText')}
        loadingText={t('users.loading.list')}
        // 行点击不再直达详情：筛选弹层点空白处收起时极易误触行；详情走行尾「查看」
        rowMenu={rowMenu}
        rowMenuLabel={t('users.actions.more')}
        floatingBarSpace
        sorting={parseSort(search.sort)}
        onSortingChange={(next) => changeSearch({ sort: stringifySort(next), page: 1 })}
        columnState={columnState}
        onColumnStateChange={setPrefs}
        density={prefs.density}
        skeletonRows={search.pageSize}
        busy={usersResult.isFetching && !usersResult.isPending}
        busyLabel={
          filterCount > 0 ? t('users.loading.filtering', { count: filterCount }) : t('users.loading.plain')
        }
        empty={
          legacyFilter ? (
            <div className="p-6">{t('users.filters.legacyPosition')}</div>
          ) : usersPage.total === 0 ? (
            hasQuery ? (
              <UsersNoResult
                filters={filters}
                keyword={search.keyword}
                onClear={clearFilters}
                onClearKeyword={() => changeSearch({ keyword: '', page: 1 })}
              />
            ) : (
              <UsersFirstUse canCreate={canCreate} onCreate={onCreateUser} />
            )
          ) : undefined
        }
        errorBanner={
          !legacyFilter && usersResult.isError && usersPage.list.length > 0
            ? {
                message: t('users.error.banner', { message: errorMessage }),
                traceId,
                retryLabel: t('users.retry'),
                copyLabel: t('users.error.copyTrace'),
                onRetry: () => void usersResult.refetch(),
              }
            : undefined
        }
        selection={{
          enabled: true,
          rowSelection,
          onRowSelectionChange,
          selectAllAriaLabel: t('users.selectPage'),
          rowSelectAriaLabel,
          renderBulkBar: (selectedIds) => (
            <FloatingActionBar
              count={selectedIds.length}
              selectedLabel={t('users.bulk.selected')}
              countLabel={t('users.bulk.unit')}
              aria-label={t('users.bulk.label')}
              onClearSelection={clearSelection}
              closeLabel={t('users.bulk.clear')}
              actions={[
                {
                  id: 'assign-roles',
                  label: t('users.actions.assignRoles'),
                  disabled: !canAssignRoles,
                  onSelect: () => setAction({ kind: 'assignRoles', ids: selectedIds }),
                },
                {
                  id: 'disable',
                  label: t('users.actions.disable'),
                  disabled: !canDisable,
                  onSelect: () => setAction({ kind: 'disable', ids: selectedIds }),
                },
              ]}
              moreLabel={t('users.bulk.more')}
              moreActions={[
                {
                  id: 'move',
                  label: t('users.actions.move'),
                  disabled: !matchPermission(authz, 'iam:user:move'),
                  onSelect: () => setAction({ kind: 'move', ids: selectedIds }),
                },
                {
                  id: 'enable',
                  label: t('users.actions.enable'),
                  disabled: !canDisable,
                  onSelect: () => setAction({ kind: 'enable', ids: selectedIds }),
                },
                {
                  id: 'reset-password',
                  label: t('users.actions.resetPassword'),
                  disabled: !canResetPassword || selectedIds.length > 50,
                  onSelect: () => setAction({ kind: 'resetPassword', ids: selectedIds }),
                },
                {
                  id: 'delete',
                  label: t('users.actions.delete'),
                  tone: 'danger',
                  disabled: !canDelete,
                  onSelect: () => setAction({ kind: 'delete', ids: selectedIds }),
                },
              ]}
            />
          ),
        }}
        pagination={{
          page: search.page,
          pageCount,
          total: usersPage.total,
          refreshing: usersResult.isFetching && !usersResult.isPending,
          totalLabel,
          refreshingLabel: t('users.refreshing'),
          prevLabel: t('users.pagination.prev'),
          nextLabel: t('users.pagination.next'),
          currentLabel: t('users.pagination.current', { page: search.page }),
          onPageChange: (page) => changeSearch({ page }),
          pageSize: {
            value: search.pageSize,
            options: [15, 30, 50, 100],
            label: (size) => t('users.pagination.pageSize', { size }),
            ariaLabel: t('users.pagination.pageSizeLabel'),
            onChange: (size) => changeSearch({ pageSize: size, page: 1 }),
          },
        }}
      />
    </>
  );

  return (
    <>
      {fullscreen ? (
        <FullscreenSurface
          title={t('users.title')}
          subtitle={totalLabel}
          escHint={tCommon('table.escToExit')}
          exitLabel={tCommon('table.exitFullscreen')}
          onExit={() => setFullscreen(false)}
        >
          {listBody}
        </FullscreenSurface>
      ) : (
        <div className="flex min-h-0 flex-1">
          <UsersDeptPanel filters={filters} onFiltersChange={applyFilters} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{listBody}</div>
        </div>
      )}

      <ConfirmDialog
        open={
          action.kind !== 'closed' &&
          action.kind !== 'assignRoles' &&
          action.kind !== 'employment' &&
          action.kind !== 'move'
        }
        severity={action.kind === 'delete' ? 'irreversible' : 'impact'}
        title={action.kind === 'closed' ? '' : t(`users.confirm.${action.kind}.title`)}
        description={
          action.kind === 'closed'
            ? undefined
            : t(`users.confirm.${action.kind}.description`, {
                count: action.ids.length,
                name: action.name ?? '',
              })
        }
        cancelText={t('users.actions.cancel')}
        confirmText={action.kind === 'closed' ? '' : t(`users.confirm.${action.kind}.confirm`)}
        confirmation={
          action.kind === 'delete' && action.name
            ? {
                label: t('users.confirm.delete.typeName'),
                expected: action.name,
                placeholder: action.name,
              }
            : undefined
        }
        pending={actionPending}
        error={
          mutations.batchDelete.isError ||
          mutations.batchDisable.isError ||
          mutations.batchEnable.isError ||
          mutations.batchResetPassword.isError
            ? t('users.form.saveFailed')
            : undefined
        }
        onOpenChange={(open) => !open && setAction(closedAction)}
        onConfirm={runAction}
      />

      <SaveSchemeDialog
        canShare={systemAdmin}
        open={savingScheme}
        filters={schemeFilters}
        onOpenChange={setSavingScheme}
        onSaved={(schemeId) => changeSearch({ schemeId })}
      />

      <UsersFilterDialog
        open={advanced.open}
        value={filters}
        params={search}
        focusConditionId={advanced.focus}
        onOpenChange={(open) => setAdvanced({ open, focus: open ? advanced.focus : undefined })}
        onApply={applyFilters}
        onSaveScheme={(next) => {
          applyFilters(next);
          openSaveScheme(stringifyFilters(next));
        }}
      />

      {resetOutcome && (
        <PasswordResetResults
          outcome={resetOutcome}
          onClose={() => {
            setResetOutcome(null);
            mutations.batchResetPassword.reset();
          }}
        />
      )}

      {action.kind === 'move' && (
        <UsersMoveDialog
          targets={action.targets ?? []}
          targetNames={Object.fromEntries(usersPage.list.map((user) => [user.id, user.name]))}
          onSuccess={clearSelection}
          onClose={() => setAction(closedAction)}
        />
      )}
      {action.kind === 'employment' && action.targets?.[0] && (
        <UserEmploymentDialog
          target={action.targets[0]}
          name={usersPage.list.find((user) => user.id === action.targets?.[0]?.id)?.name}
          status={action.employmentStatus ?? null}
          onClose={() => setAction(closedAction)}
        />
      )}
      {action.kind === 'assignRoles' && (
        <UsersRolesDialog
          targets={action.targets ?? []}
          targetNames={Object.fromEntries(usersPage.list.map((user) => [user.id, user.name]))}
          onSuccess={clearSelection}
          onClose={() => setAction(closedAction)}
        />
      )}
    </>
  );
}
