import { Fragment, type JSX, type ReactNode } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PermissionAction } from '@/components/pro/PermissionAction';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { matchPermission, type AuthzContext } from '@/lib/permission';
import { UserAccountPolicyMenuItem } from '../components/UserAccountPolicyMenuItem';
import { userRowMenu } from '../list/rowMenu';
import type { UserDetailDto } from '../api';

/** 页签行右侧的操作区：上一位/下一位、更多、编辑。 */
export function UserDetailActions({
  user,
  authz,
  navigation,
  onEdit,
  onResetPassword,
  onAccountPolicy,
  onAction,
}: {
  user: UserDetailDto;
  authz: AuthzContext;
  navigation?: ReactNode;
  onEdit: () => void;
  onResetPassword: () => void;
  onAccountPolicy: () => void;
  onAction: (kind: 'disable' | 'enable' | 'delete' | 'assignRoles' | 'employment', name: string) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  // 「查看详情」在详情页自身无意义、「编辑」是主按钮，去掉后剩下的项与列表行菜单逐项同源
  const menuItems = userRowMenu(user, {
    t,
    authz,
    actions: {
      onView: () => undefined,
      onEdit,
      onResetPassword,
      onAssignRoles: () => onAction('assignRoles', user.name),
      onToggleEnabled: () => onAction(user.enabled ? 'disable' : 'enable', user.name),
      onChangeEmployment: () => onAction('employment', user.name),
      onDelete: () => onAction('delete', user.name),
    },
  }).filter((item) => item.id !== 'view' && item.id !== 'edit');

  return (
    <div data-slot="user-detail-actions" className="flex items-center gap-[calc(8px*var(--app-scale))]">
      {navigation}
      {/* 更多菜单与列表行菜单同一份 RowMenuItem 定义；不复用 pro/RowActionsMenu：那是表格行形态（hover 现身 + 行尾渐变遮罩） */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary" size="sm" aria-label={t('users.actions.more')}>
            {t('users.actions.moreShort')}
            <ChevronDown data-icon="inline-end" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <UserAccountPolicyMenuItem
            userId={user.id}
            systemAdmin={user.systemAdmin}
            authz={authz}
            onSelect={onAccountPolicy}
          />
          {menuItems.map((item) => (
            <Fragment key={item.id}>
              {item.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                data-row-menu-item={item.id}
                variant={item.tone === 'danger' ? 'destructive' : 'default'}
                disabled={item.disabled}
                onSelect={item.onSelect}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* 普通操作缺权限隐藏（permissionDegradeMap.action = 'hide'） */}
      <PermissionAction allowed={matchPermission(authz, 'iam:user:update')} degrade="hide">
        <Button type="button" size="sm" onClick={onEdit}>
          <Pencil data-icon="inline-start" aria-hidden="true" />
          {t('users.actions.edit')}
        </Button>
      </PermissionAction>
    </div>
  );
}
