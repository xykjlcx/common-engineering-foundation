import { Briefcase, CircleSlash, Eye, KeyRound, Pencil, Trash2, UserCog } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { RowMenuItem } from '@/components/pro/row-menu';
import { matchPermission, type AuthzContext } from '@/lib/permission';
import type { UserDto } from '../api';

export interface UserRowMenuActions {
  onView: (user: UserDto) => void;
  onEdit: (user: UserDto) => void;
  onResetPassword: (user: UserDto) => void;
  onAssignRoles: (user: UserDto) => void;
  onToggleEnabled: (user: UserDto) => void;
  onDelete: (user: UserDto) => void;
  onChangeEmployment?: (user: UserDto) => void;
}

const iconClass = 'size-[calc(14px*var(--app-scale))]';

export function userRowMenu(
  user: UserDto,
  { t, authz, actions }: { t: TFunction<'admin'>; authz: AuthzContext; actions: UserRowMenuActions },
): RowMenuItem[] {
  const canUpdate = matchPermission(authz, 'iam:user:update');
  const canResetPassword = matchPermission(authz, 'iam:user:reset_password');
  const canAssignRoles = matchPermission(authz, 'iam:user:assign_roles');
  const canDisable = matchPermission(authz, 'iam:user:change_status');
  const canDelete = matchPermission(authz, 'iam:user:delete');

  return [
    {
      id: 'view',
      label: t('users.actions.view'),
      icon: <Eye aria-hidden="true" className={iconClass} />,
      shortcut: 'Enter',
      onSelect: () => actions.onView(user),
    },
    {
      id: 'edit',
      label: t('users.actions.edit'),
      icon: <Pencil aria-hidden="true" className={iconClass} />,
      shortcut: 'E',
      disabled: !canUpdate,
      onSelect: () => actions.onEdit(user),
    },
    {
      id: 'reset-password',
      label: t('users.actions.resetPassword'),
      icon: <KeyRound aria-hidden="true" className={iconClass} />,
      separatorBefore: true,
      disabled: !canResetPassword || user.systemAdmin,
      onSelect: () => actions.onResetPassword(user),
    },
    {
      id: 'assign-roles',
      label: t('users.actions.assignRoles'),
      icon: <UserCog aria-hidden="true" className={iconClass} />,
      disabled: !canAssignRoles,
      onSelect: () => actions.onAssignRoles(user),
    },
    {
      id: 'employment',
      label: t('users.actions.employment'),
      icon: <Briefcase aria-hidden="true" className={iconClass} />,
      disabled: !canDisable || user.systemAdmin || !actions.onChangeEmployment,
      onSelect: () => actions.onChangeEmployment?.(user),
    },
    {
      id: 'toggle-enabled',
      label: user.enabled ? t('users.actions.disable') : t('users.actions.enable'),
      icon: <CircleSlash aria-hidden="true" className={iconClass} />,
      separatorBefore: true,
      tone: 'danger',
      disabled: !canDisable || user.systemAdmin || user.status === 'left',
      onSelect: () => actions.onToggleEnabled(user),
    },
    {
      id: 'delete',
      label: t('users.actions.delete'),
      icon: <Trash2 aria-hidden="true" className={iconClass} />,
      tone: 'danger',
      disabled: !canDelete,
      onSelect: () => actions.onDelete(user),
    },
  ];
}
