import { useMemo, useState } from 'react';
import { hashKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { QueryState } from '@/components/pro/QueryState';
import { useLastSuccessfulData } from '@/components/pro/use-last-successful-data';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { matchPermission } from '@/lib/permission';
import { meQuery } from '@/modules/admin/auth/api';
import { permissionsFromIds, permissionsWithAncestors } from '../model';
import { auditKeys } from '@/modules/admin/audit/api';
import { menuKeys } from '@/modules/admin/menus/api';
import { userKeys } from '@/modules/admin/users/api/keys';
import {
  permissionTreeQuery,
  roleApi,
  roleDetailQuery,
  roleKeys,
  rolesQuery,
  RoleSchema,
  type RoleDto,
} from '../api';
import { departmentTreeQuery as deptTreeQuery } from '@/modules/admin/depts/api';
import { CreateRoleDialog, EditRoleDialog } from '../form/RoleDialogs';
import { RoleDetailsPanel } from '../detail/RoleDetailsPanel';
import { RoleListPanel } from './RoleListPanel';
import type { DetailTab, RolesViewProps } from '../types';
export type { RolesViewProps };
export interface RolesPageProps {
  permissions: string[];
  systemAdmin?: boolean;
  roleId: string;
  onRoleIdChange: (roleId: string) => void;
}
export function RolesScene(props: RolesPageProps) {
  const { t } = useTranslation('admin');
  const list = useQuery(rolesQuery);
  // 刷新失败时留住上一份成功列表：QueryState 走「旧行 + 顶部通条」，不整页塌成错误屏。
  const roleList = useLastSuccessfulData(list.data);
  const activeId = roleList?.some((role) => role.id === props.roleId)
    ? props.roleId
    : (roleList?.[0]?.id ?? '');
  const detail = useQuery({ ...roleDetailQuery(activeId), enabled: !!activeId });
  return (
    <QueryState
      data={roleList}
      pending={list.isPending}
      refreshing={list.isFetching && !list.isPending}
      error={list.isError}
      loadingLabel={t('roles.refreshing')}
      errorLabel={t('roles.loadFailed')}
      retryLabel={t('roles.retry')}
      onRetry={() => void list.refetch()}
    >
      {(roles) =>
        activeId ? (
          <QueryState
            data={detail.data}
            pending={detail.isPending}
            error={detail.isError}
            loadingLabel={t('roles.refreshing')}
            errorLabel={t('roles.loadFailed')}
            retryLabel={t('roles.retry')}
            onRetry={() => void detail.refetch()}
          >
            {(role) => <RoleSession key={activeId} {...props} roles={roles} initial={role} />}
          </QueryState>
        ) : (
          <RoleSession key="empty" {...props} roles={roles} />
        )
      }
    </QueryState>
  );
}
type Detail = Awaited<ReturnType<NonNullable<ReturnType<typeof roleDetailQuery>['queryFn']>>>;
function RoleSession({ roles, initial, ...props }: RolesPageProps & { roles: RoleDto[]; initial?: Detail }) {
  const { t } = useTranslation('admin');
  const qc = useQueryClient();
  const router = useRouter({ warn: false });
  // 一个编辑会话绑定一个版本；后台refetch不能抬升旧草稿的version。
  const [baseline, setBaseline] = useState(initial);
  const canGrant = matchPermission(
    { permissions: props.permissions, systemAdmin: props.systemAdmin ?? false },
    'iam:role:grant',
  );
  const catalog = useQuery({ ...permissionTreeQuery, enabled: canGrant });
  const translatedCatalog = useMemo(
    () => catalog.data?.map((group) => ({ ...group, label: group.label || t('roles.matrix.ungrouped') })),
    [catalog.data, t],
  );
  const depts = useQuery({ ...deptTreeQuery, enabled: props.systemAdmin === true });
  const invalidate = async (removedRoleId?: string) => {
    await Promise.all([
      qc.invalidateQueries({
        queryKey: roleKeys.all,
        predicate: (query) => !removedRoleId || query.queryHash !== hashKey(roleKeys.detail(removedRoleId)),
      }),
      qc.invalidateQueries({ queryKey: auditKeys.operationLists() }),
      qc.invalidateQueries({ queryKey: userKeys.all }),
      qc.invalidateQueries({ queryKey: meQuery.queryKey, refetchType: 'none' }),
      qc.invalidateQueries({ queryKey: menuKeys.navigation(), refetchType: 'none' }),
    ]);
    await router?.invalidate({ sync: true, filter: (match) => match.routeId.startsWith('/_auth') });
  };
  const saved = async (work: Promise<Partial<Detail>>) => {
    const committed = await work;
    // 只推进本次已提交字段和版本，后台回读不能替另一页签接受新基线。
    setBaseline((current) => (current ? { ...current, ...committed } : current));
    await invalidate();
  };
  const roleRows = baseline
    ? roles.map((role) => (role.id === baseline.id ? RoleSchema.parse(baseline) : role))
    : roles;
  const permissions = useMemo(
    () => permissionsFromIds(baseline?.menuIds ?? [], translatedCatalog ?? []),
    [baseline?.menuIds, translatedCatalog],
  );
  const scope = useMemo(
    () => ({
      defaultScope: baseline?.dataScope ?? ('self' as const),
      defaultDepartmentIds: baseline?.deptIds ?? [],
      resources: {},
    }),
    [baseline?.dataScope, baseline?.deptIds],
  );
  const fallbackTree = [
    {
      id: 'assigned',
      label: t('roles.detailTabs.permissions'),
      resources: (baseline?.menuIds ?? []).map((id) => ({
        id,
        label: id,
        code: '',
        actions: [{ id, label: id }],
      })),
    },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <QueryState
        data={canGrant ? catalog.data : fallbackTree}
        pending={canGrant && catalog.isPending}
        refreshing={canGrant && catalog.isFetching && !catalog.isPending}
        error={canGrant && catalog.isError}
        loadingLabel={t('roles.refreshing')}
        errorLabel={t('roles.loadFailed')}
        retryLabel={t('roles.retry')}
        onRetry={() => void catalog.refetch()}
      >
        {() => (
          <RolesView
            {...props}
            roles={roleRows}
            activeRoleId={baseline?.id ?? ''}
            permissionTree={translatedCatalog ?? fallbackTree}
            rolePermissions={permissions}
            roleDataPermission={scope}
            departments={depts.data ?? []}
            roleEnabled={baseline?.enabled ?? true}
            memberCount={baseline?.memberCount ?? null}
            onActiveRoleChange={props.onRoleIdChange}
            onCreateRole={async (dto) => {
              const created = await roleApi.createRole(dto);
              await invalidate();
              props.onRoleIdChange(created.id);
            }}
            onUpdateRole={async (id, dto) => {
              if (baseline)
                await saved(
                  roleApi
                    .updateRole(id, dto, baseline.version)
                    .then(({ name, description, version }) => ({ name, description, version })),
                );
            }}
            onDeleteRole={async (id) => {
              if (baseline) {
                await roleApi.deleteRole({ id, version: baseline.version });
                await invalidate(id);
                props.onRoleIdChange('');
              }
            }}
            onDisableRole={async (id) => {
              if (baseline)
                await saved(
                  roleApi
                    .setRoleEnabled({ id, version: baseline.version }, !baseline.enabled)
                    .then(({ enabled, version }) => ({ enabled, version })),
                );
            }}
            onSaveRolePermissions={async (id, value) => {
              if (baseline)
                await saved(
                  roleApi.saveRolePermissions(
                    id,
                    permissionsWithAncestors(value, translatedCatalog ?? []),
                    baseline.version,
                  ),
                );
            }}
            onSaveRoleDataPermissions={async (id, value) => {
              if (baseline)
                await saved(
                  roleApi
                    .saveRoleDataPermissions(id, value, baseline.version)
                    .then(({ dataScope, deptIds, version }) => ({ dataScope, deptIds, version })),
                );
            }}
          />
        )}
      </QueryState>
    </div>
  );
}

export function RolesView({
  permissions,
  systemAdmin = false,
  roles,
  activeRoleId,
  permissionTree,
  rolePermissions,
  roleDataPermission,
  departments,
  roleDetailLoading = false,
  roleDetailRefreshing = false,
  memberCount,
  roleEnabled = true,
  onActiveRoleChange,
  onCreateRole,
  onDeleteRole,
  onUpdateRole = () => undefined,
  onDisableRole = () => undefined,
  onSaveRolePermissions,
  onSaveRoleDataPermissions,
}: RolesViewProps) {
  const { t } = useTranslation('admin');
  const activeRole = roles.find((role) => role.id === activeRoleId) ?? roles[0];
  const currentRoleId = activeRole?.id ?? activeRoleId;
  const [dirty, setDirty] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<string>();
  const [detailTab, setDetailTab] = useState<DetailTab>('permissions');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);
  const [editTarget, setEditTarget] = useState<RoleDto | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const canCreateRole = matchPermission({ permissions, systemAdmin }, 'iam:role:create');
  const canDeleteRole = matchPermission({ permissions, systemAdmin }, 'iam:role:del');
  const canGrant = matchPermission({ permissions, systemAdmin }, 'iam:role:grant');

  const confirmDeleteRole = async () => {
    if (!deleteTarget) return;
    try {
      await onDeleteRole(deleteTarget.id);
    } catch {
      setDeleteError(true);
      return;
    }
    setDeleteTarget(null);
  };

  return (
    <PageFrame
      data-role-page-frame
      breadcrumbs={[{ label: t('roles.breadcrumbGroup') }, { label: t('roles.title') }]}
      className="min-h-0 flex-1 overflow-hidden"
    >
      <PageSurface data-role-page-surface className="min-h-0 flex-1">
        <div data-role-workspace className="flex min-h-0 flex-1 overflow-hidden">
          <RoleListPanel
            roles={roles}
            currentRoleId={currentRoleId}
            canCreateRole={canCreateRole}
            onActiveRoleChange={(id) => {
              if (dirty && id !== currentRoleId) setPendingRoleId(id);
              else onActiveRoleChange(id);
            }}
            onCreateRole={() => setRoleDialogOpen(true)}
          />
          <main
            data-role-detail-shell
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain border-l border-(--page-section-divider) px-(--page-scene-px) py-(--page-scene-py)"
          >
            <RoleDetailsPanel
              activeRole={activeRole}
              currentRoleId={currentRoleId}
              detailTab={detailTab}
              permissionTree={permissionTree}
              rolePermissions={rolePermissions}
              roleDataPermission={roleDataPermission}
              departments={departments}
              roleDetailLoading={roleDetailLoading}
              roleDetailRefreshing={roleDetailRefreshing}
              canDeleteRole={canDeleteRole}
              canGrant={canGrant}
              canEdit={matchPermission({ permissions, systemAdmin }, 'iam:role:update')}
              canScope={systemAdmin}
              memberCount={memberCount}
              canMembers={matchPermission({ permissions, systemAdmin }, 'iam:user:view')}
              canChanges={matchPermission({ permissions, systemAdmin }, 'audit:log:view')}
              onDirtyChange={(value) => setDirty(value)}
              roleEnabled={roleEnabled}
              onDetailTabChange={(tab) => setDetailTab(tab)}
              onDeleteRole={(role) => setDeleteTarget(role)}
              onUpdateRole={(role) => setEditTarget(role)}
              onDisableRole={onDisableRole}
              onSaveRolePermissions={onSaveRolePermissions}
              onSaveRoleDataPermissions={onSaveRoleDataPermissions}
            />
          </main>
        </div>
      </PageSurface>

      <ConfirmDialog
        open={pendingRoleId !== undefined}
        title={t('roles.matrix.switchTitle')}
        description={t('roles.matrix.switchDescription')}
        confirmText={t('roles.matrix.discard')}
        cancelText={t('roles.actions.cancel')}
        onOpenChange={(open) => {
          if (!open) setPendingRoleId(undefined);
        }}
        onConfirm={() => {
          if (pendingRoleId) {
            setDirty(false);
            onActiveRoleChange(pendingRoleId);
            setPendingRoleId(undefined);
          }
        }}
      />
      <CreateRoleDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} onCreateRole={onCreateRole} />
      <EditRoleDialog
        open={!!editTarget}
        role={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onUpdateRole={async (id, dto) => {
          await onUpdateRole(id, dto);
          setEditTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('roles.dialog.deleteRoleTitle')}
        description={t('roles.dialog.deleteRoleDesc')}
        cancelText={t('roles.actions.cancel')}
        confirmText={t('roles.actions.confirmDelete')}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        error={deleteError ? t('roles.saveFailed') : undefined}
        onConfirm={confirmDeleteRole}
      />
    </PageFrame>
  );
}
