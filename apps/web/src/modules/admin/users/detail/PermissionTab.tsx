import { useMemo, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { PermissionAction } from '@/components/pro/PermissionAction';
import { TableText } from '@/components/pro/TableText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { matchPermission, type AuthzContext } from '@/lib/permission';
import { userDeptTreeQuery as deptTreeQuery, userRolesQuery as rolesQuery } from '../api/dictionaries';
import { DetailMain, DetailSection, DetailWorkspace } from '@/components/pro/page-scaffold';
import { formatLocalDateTime } from '@/lib/datetime';
import { auditActionKey, groupPermissionLabels, permissionChangeTone } from '../model';
import type { PermissionChangeDto, RoleGrantDto, UserDetailDto } from '../api';

const changeToneClass = {
  add: 'success',
  remove: 'danger',
  neutral: 'body',
} as const;

/** permissionChanges 是审计事件流，后端不发 id；行号即唯一键（同秒同动作可重复） */
type PermissionChangeRow = PermissionChangeDto & { rowId: string };

export function PermissionTab({
  user,
  authz,
  onAssignRoles,
}: {
  user: UserDetailDto;
  authz: AuthzContext;
  onAssignRoles: () => void;
}): JSX.Element {
  const { t, i18n } = useTranslation('admin');
  const { data: roles } = useQuery(rolesQuery);
  const { data: depts = [] } = useQuery(deptTreeQuery);
  const totalPermissions = user.effectivePermissions?.length ?? 0;
  const permissionGroups = useMemo(
    () =>
      groupPermissionLabels(
        user.effectivePermissions ?? [],
        user.effectivePermissionLabels,
        i18n.language,
        t('users.detail.permissionOtherGroup'),
      ),
    [i18n.language, t, user.effectivePermissionLabels, user.effectivePermissions],
  );
  const deptNameById = useMemo(() => new Map(depts.map((dept) => [dept.id, dept.name])), [depts]);
  const canAssign = matchPermission(authz, 'iam:user:assign_roles');
  const roleById = useMemo(() => new Map((roles ?? []).map((role) => [role.id, role])), [roles]);

  const roleColumns = useMemo<ColumnDef<RoleGrantDto>[]>(
    () => [
      {
        id: 'roleName',
        header: t('users.detail.roleName'),
        size: 120,
        cell: ({ row }) => (
          <TableText tone="strong">
            {roleById.get(row.original.roleId)?.name ?? row.original.roleId}
          </TableText>
        ),
      },
      {
        id: 'roleDesc',
        header: t('users.detail.roleDesc'),
        size: 190,
        cell: ({ row }) => <TableText>{roleById.get(row.original.roleId)?.description ?? '—'}</TableText>,
      },
      {
        id: 'roleSubsystem',
        header: t('users.detail.roleSubsystem'),
        size: 84,
        cell: ({ row }) => (
          <Badge variant="neutral">
            {roleById.get(row.original.roleId)?.type === 'system'
              ? t('users.form.systemRole')
              : t('users.form.customRole')}
          </Badge>
        ),
      },
      {
        id: 'grantedBy',
        header: t('users.detail.grantedBy'),
        size: 96,
        cell: ({ row }) => (
          <TableText>
            {row.original.grantedByName ?? row.original.grantedBy ?? t('users.detail.notRecorded')}
          </TableText>
        ),
      },
      {
        id: 'grantedAt',
        header: t('users.detail.grantedAt'),
        size: 140,
        cell: ({ row }) => (
          <TableText tone="weak" mono>
            {formatLocalDateTime(row.original.grantedAt)}
          </TableText>
        ),
      },
      {
        id: 'roleActions',
        header: t('users.actions.more'),
        size: 72,
        cell: () => (
          <PermissionAction allowed={canAssign} degrade="hide">
            <Button type="button" variant="link" size="xs" onClick={onAssignRoles}>
              {t('users.actions.removeRole')}
            </Button>
          </PermissionAction>
        ),
      },
    ],
    [canAssign, onAssignRoles, roleById, t],
  );

  const changeRows = useMemo<PermissionChangeRow[]>(
    () => user.permissionChanges.map((change, index) => ({ ...change, rowId: `${change.at}-${index}` })),
    [user.permissionChanges],
  );

  const changeColumns = useMemo<ColumnDef<PermissionChangeRow>[]>(
    () => [
      {
        id: 'at',
        header: t('users.detail.changeAt'),
        size: 140,
        cell: ({ row }) => (
          <TableText tone="weak" mono>
            {formatLocalDateTime(row.original.at)}
          </TableText>
        ),
      },
      {
        id: 'action',
        header: t('users.detail.changeAction'),
        size: 120,
        cell: ({ row }) => (
          <TableText tone={changeToneClass[permissionChangeTone(row.original)]}>
            {t(`users.logs.actions.${auditActionKey(row.original.action) ?? 'unknown'}`)}
          </TableText>
        ),
      },
      {
        id: 'target',
        header: t('users.detail.changeTarget'),
        size: 220,
        cell: ({ row }) => {
          const nameOf = (id: string) => roleById.get(id)?.name ?? id;
          const { addedRoleIds, removedRoleIds } = row.original;
          if (addedRoleIds.length + removedRoleIds.length === 0) {
            return <TableText tone="weak">{t('users.detail.changeNoRoleDiff')}</TableText>;
          }
          return (
            <span className="grid gap-0.5">
              {addedRoleIds.length > 0 && (
                <TableText tone="success">
                  {t('users.detail.changeAdded', { names: addedRoleIds.map(nameOf).join('、') })}
                </TableText>
              )}
              {removedRoleIds.length > 0 && (
                <TableText tone="danger">
                  {t('users.detail.changeRemoved', { names: removedRoleIds.map(nameOf).join('、') })}
                </TableText>
              )}
            </span>
          );
        },
      },
      {
        id: 'operator',
        header: t('users.detail.changeOperator'),
        size: 110,
        cell: ({ row }) => (
          <TableText>{row.original.operatorName ?? t('users.detail.notRecorded')}</TableText>
        ),
      },
    ],
    [roleById, t],
  );

  return (
    <DetailWorkspace
      data-slot="user-permission-tab"
      className="gap-2.5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
    >
      <DetailMain className="gap-2.5">
        <DetailSection
          title={t('users.detail.assignedRoles')}
          bodyClassName="p-0"
          actions={
            <PermissionAction allowed={canAssign} degrade="hide">
              <Button type="button" variant="secondary" size="sm" onClick={onAssignRoles}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                {t('users.actions.assignRoles')}
              </Button>
            </PermissionAction>
          }
        >
          <DataTable
            columns={roleColumns}
            data={user.roleGrants}
            rowKey={(row) => row.roleId}
            density="relaxed"
            enableColumnResizing={false}
            emptyText={t('users.detail.noRoles')}
            loadingText={t('users.logs.loading')}
          />
        </DetailSection>

        <DetailSection title={t('users.detail.dataScope')}>
          <div className="flex flex-wrap items-center gap-[calc(8px*var(--app-scale))]">
            {user.systemAdmin && user.effectivePermissions === null ? (
              <Badge variant="warning">{t('users.detail.unrestricted')}</Badge>
            ) : user.scopeSources.length ? (
              user.scopeSources.map((source) => {
                const names = source.deptIds.flatMap((id) => deptNameById.get(id) ?? []);
                const shown = names.slice(0, 3).join('、');
                const detail =
                  names.length === 0
                    ? source.deptIds.length > 0
                      ? t('users.detail.scopeDeptCount', { count: source.deptIds.length })
                      : ''
                    : names.length > 3
                      ? t('users.detail.scopeDeptMore', { names: shown, count: names.length })
                      : shown;
                return (
                  <Badge key={source.roleId} variant="warning" title={names.join('、') || undefined}>
                    {roleById.get(source.roleId)?.name ?? t('users.detail.notRecorded')}：
                    {t(
                      `users.dataScope.${source.scope === 'deptAndChildren' ? 'deptAndSub' : source.scope === 'self' ? 'self' : source.scope}`,
                    )}
                    {detail ? `（${detail}）` : ''}
                  </Badge>
                );
              })
            ) : (
              <span>{t('users.detail.notRecorded')}</span>
            )}
          </div>
        </DetailSection>

        <DetailSection title={t('users.detail.permissionChanges')} bodyClassName="p-0">
          <DataTable
            columns={changeColumns}
            data={changeRows}
            rowKey={(row) => row.rowId}
            density="relaxed"
            enableColumnResizing={false}
            emptyText={t('users.detail.noPermissionChanges')}
            loadingText={t('users.logs.loading')}
          />
        </DetailSection>
      </DetailMain>
      <DetailMain className="gap-2.5">
        <DetailSection title={t('users.detail.effectivePermissionsTitle', { count: totalPermissions })}>
          {user.effectivePermissions === null ? (
            <span>{t('users.detail.unrestricted')}</span>
          ) : user.effectivePermissions.length === 0 ? (
            <Empty variant="noResult" title={t('users.detail.noPermissions')} />
          ) : (
            <div className="grid gap-[calc(14px*var(--app-scale))]">
              {permissionGroups.map((group) => (
                <div key={group.page} data-slot="user-permission-group" className="grid gap-2">
                  <div className="flex items-baseline gap-2">
                    <TableText tone="strong">{group.page}</TableText>
                    <TableText tone="weak">
                      {t('users.detail.permissionGroupCount', { count: group.items.length })}
                    </TableText>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <Badge key={item.code} variant="neutral" title={item.code}>
                        {item.isPage ? t('users.detail.permissionPageAccess') : item.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      </DetailMain>
    </DetailWorkspace>
  );
}
