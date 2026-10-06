import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { SideCardList } from '@/components/pro/SideList';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import type { RoleDto } from '@/modules/admin/roles/api';
import { RoleTypeChip } from '../components/RoleTypeChip';

export function RoleListPanel({
  roles,
  currentRoleId,
  canCreateRole,
  onActiveRoleChange,
  onCreateRole,
}: {
  roles: RoleDto[];
  currentRoleId: string;
  canCreateRole: boolean;
  onActiveRoleChange: (id: string) => void;
  onCreateRole: () => void;
}) {
  const { t } = useTranslation('admin');
  const [roleKeyword, setRoleKeyword] = useState('');
  const visibleRoles = useMemo(() => {
    const keyword = roleKeyword.trim().toLowerCase();
    if (!keyword) return roles;
    return roles.filter(
      (role) => role.name.toLowerCase().includes(keyword) || role.desc.toLowerCase().includes(keyword),
    );
  }, [roleKeyword, roles]);

  return (
    <aside
      data-role-list-panel
      className="flex min-h-0 w-[calc(280px*var(--app-scale))] shrink-0 flex-col px-3 py-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <TableText tone="strong">{t('roles.title')}</TableText>
        <TableText tone="hint">{roles.length}</TableText>
        {canCreateRole && (
          <Button size="sm" className="ml-auto" onClick={onCreateRole}>
            <Plus />
            {t('roles.actions.addRole')}
          </Button>
        )}
      </div>
      <SearchField
        containerClassName="mb-3"
        placeholder={t('roles.searchPlaceholder')}
        value={roleKeyword}
        onChange={(event) => setRoleKeyword(event.target.value)}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleRoles.length > 0 ? (
          <SideCardList
            items={visibleRoles.map((role) => ({
              id: role.id,
              ariaLabel: role.name,
              label: (
                <span className="flex items-center gap-2">
                  <TableText>{role.name}</TableText>
                  {role.type === 'system' && (
                    <RoleTypeChip type={role.type} label={t(`roles.roleTypes.${role.type}`)} />
                  )}
                  <StatusBadge tone={role.enabled === false ? 'neutral' : 'success'}>
                    {t(role.enabled === false ? 'roles.disabled' : 'roles.enabled')}
                  </StatusBadge>
                </span>
              ),
              description: role.desc || '—',
              action: <TableText mono>{role.memberCount ?? '—'}</TableText>,
            }))}
            activeId={currentRoleId}
            onSelect={onActiveRoleChange}
          />
        ) : (
          <Empty title={t('roles.empty')} className="px-3 py-8" />
        )}
      </div>
    </aside>
  );
}
