import { useEffect, useState } from 'react';
import { FieldError } from '@/components/ui/field';
import { Ban, Edit3, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatedTabs, type AnimatedTabItem } from '@/components/pro/AnimatedTabs';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  PermissionTreeGroupDto,
  RoleDataPermission,
  RoleDto,
  RolePermissionMap,
} from '@/modules/admin/roles/api';
import type { DeptDto } from '@/modules/admin/depts/api';
import { RoleDataPermissionEditor } from './RoleDataPermissionEditor';
import { RoleTypeChip } from '../components/RoleTypeChip';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { RoleMembers } from './RoleMembers';
import { RoleChanges } from './RoleChanges';
import { RolePermissionEditor } from './RolePermissionEditor';
import type { DetailTab } from '../types';

export function RoleDetailsPanel({
  activeRole,
  currentRoleId,
  detailTab,
  permissionTree,
  rolePermissions,
  roleDataPermission,
  departments,
  roleDetailLoading,
  roleDetailRefreshing,
  canDeleteRole,
  canGrant,
  canEdit = canGrant,
  canScope = canGrant,
  memberCount,
  canMembers = false,
  canChanges = false,
  onDirtyChange,
  roleEnabled = true,
  onDetailTabChange,
  onDeleteRole,
  onUpdateRole,
  onDisableRole,
  onSaveRolePermissions,
  onSaveRoleDataPermissions,
}: {
  activeRole: RoleDto | undefined;
  currentRoleId: string;
  detailTab: DetailTab;
  permissionTree: PermissionTreeGroupDto[];
  rolePermissions: RolePermissionMap;
  roleDataPermission: RoleDataPermission;
  departments: Pick<DeptDto, 'id' | 'name'>[];
  roleDetailLoading: boolean;
  roleDetailRefreshing: boolean;
  canDeleteRole: boolean;
  canGrant: boolean;
  canEdit?: boolean;
  canScope?: boolean;
  memberCount: number | null;
  canMembers?: boolean;
  canChanges?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  roleEnabled?: boolean;
  onDetailTabChange: (tab: DetailTab) => void;
  onDeleteRole: (role: RoleDto) => void;
  onUpdateRole: (role: RoleDto) => void;
  onDisableRole: (id: string) => void | Promise<void>;
  onSaveRolePermissions: (id: string, permissions: RolePermissionMap) => void | Promise<void>;
  onSaveRoleDataPermissions: (id: string, permission: RoleDataPermission) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [permissionDirty, setPermissionDirty] = useState(false);
  const [dataDirty, setDataDirty] = useState(false);
  useEffect(() => {
    onDirtyChange?.(permissionDirty || dataDirty);
  }, [permissionDirty, dataDirty, onDirtyChange]);
  const [disabling, setDisabling] = useState(false);
  const [disableFailed, setDisableFailed] = useState(false);
  const toggleDisabled = async (id: string) => {
    if (disabling) return;
    setDisabling(true);
    setDisableFailed(false);
    try {
      await onDisableRole(id);
    } catch {
      setDisableFailed(true);
    } finally {
      setDisabling(false);
    }
  };
  const detailTabItems: AnimatedTabItem<DetailTab>[] = [
    { value: 'permissions', label: t('roles.detailTabs.permissions') },
    { value: 'dataPermissions', label: t('roles.detailTabs.dataPermissions') },
    ...(canMembers
      ? [{ value: 'members' as const, label: t('roles.detailTabs.members', { count: memberCount ?? 0 }) }]
      : []),
    ...(canChanges ? [{ value: 'changes' as const, label: t('depts.changes') }] : []),
  ];

  if (!activeRole) {
    return <Empty title={t('roles.empty')} className="flex-1" />;
  }

  return (
    <div data-role-detail-layout className="flex min-h-full flex-col">
      <div className="mb-1 flex items-center gap-2.5">
        <h1>
          <TableText tone="strong">{activeRole.name}</TableText>
        </h1>
        <StatusBadge tone={roleEnabled ? 'success' : 'neutral'}>
          {t(roleEnabled ? 'roles.enabled' : 'roles.disabled')}
        </StatusBadge>
        <RoleTypeChip type={activeRole.type} label={t(`roles.roleTypes.${activeRole.type}`)} />
        <div className="flex-1" />
        {activeRole.type === 'custom' && canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onUpdateRole(activeRole)}>
            <Edit3 data-icon="inline-start" />
            {t('roles.dialog.editRoleTitle')}
          </Button>
        ) : null}
        {activeRole.type === 'custom' && canScope ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={disabling}
            onClick={() => void toggleDisabled(activeRole.id)}
          >
            <Ban data-icon="inline-start" />
            {t(roleEnabled ? 'roles.actions.disableRole' : 'roles.actions.enableRole')}
          </Button>
        ) : null}
        {activeRole.type === 'custom' && canDeleteRole ? (
          <Button type="button" variant="danger-ghost" size="sm" onClick={() => onDeleteRole(activeRole)}>
            <Trash2 data-icon="inline-start" />
            {t('roles.actions.deleteRole')}
          </Button>
        ) : null}
      </div>
      <FieldError role="alert">{disableFailed ? t('roles.saveFailed') : null}</FieldError>
      <p className="mb-3 text-[calc(13px*var(--app-scale))] text-text-3">{activeRole.desc}</p>

      <AnimatedTabs
        value={detailTab}
        items={detailTabItems}
        onValueChange={onDetailTabChange}
        variant="content"
        className="mb-4"
        trailing={
          roleDetailLoading || roleDetailRefreshing ? (
            <span className="mb-2.5 text-[calc(12px*var(--app-scale))] text-(--accent-emphasis)">
              {t('roles.refreshing')}
            </span>
          ) : null
        }
      />

      {roleDetailLoading ? (
        <RoleDetailLoadingState label={t('roles.refreshing')} />
      ) : (
        <>
          <div hidden={detailTab !== 'permissions'}>
            {canGrant ? (
              <RolePermissionEditor
                key={currentRoleId}
                roleId={currentRoleId}
                permissionTree={permissionTree}
                rolePermissions={rolePermissions}
                canGrant={canGrant && activeRole.type === 'custom'}
                onSave={onSaveRolePermissions}
                memberCount={memberCount}
                onDirtyChange={(value) => setPermissionDirty(value)}
              />
            ) : (
              <TableText tone="hint">{t('roles.matrix.restricted')}</TableText>
            )}
          </div>
          <div hidden={detailTab !== 'dataPermissions'}>
            <RoleDataPermissionEditor
              roleId={currentRoleId}
              permission={roleDataPermission}
              departments={departments}
              canGrant={canScope && activeRole.type === 'custom'}
              onSave={onSaveRoleDataPermissions}
              onDirtyChange={(value) => setDataDirty(value)}
            />
          </div>
          {detailTab === 'members' && canMembers && <RoleMembers id={currentRoleId} />}
          {detailTab === 'changes' && canChanges && <RoleChanges id={currentRoleId} />}
        </>
      )}
    </div>
  );
}

function RoleDetailLoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2.5">
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          data-testid="role-detail-loading-row"
          className="rounded-10 border border-border p-3"
        >
          <Skeleton className="h-3 w-40" />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((__, itemIndex) => (
              <Skeleton key={itemIndex} className="h-[calc(30px*var(--app-scale))] rounded-7" />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
