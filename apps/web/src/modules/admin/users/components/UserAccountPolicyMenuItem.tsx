import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { meQuery } from '@/modules/admin/auth/api';
import { matchPermission, type AuthzContext } from '@/lib/permission';

/** 与后端账号生命周期保护一致；身份尚未确认时不允许编辑。 */
export function UserAccountPolicyMenuItem({
  userId,
  systemAdmin,
  authz,
  onSelect,
}: {
  userId: string;
  systemAdmin: boolean;
  authz: AuthzContext;
  onSelect: () => void;
}) {
  const { t } = useTranslation('admin');
  const allowed = matchPermission(authz, 'iam:user:change_status');
  const identity = useQuery({ ...meQuery, enabled: allowed && !systemAdmin });
  if (!allowed) return null;
  const protectedTarget = systemAdmin || identity.data?.userId === userId;
  return (
    <DropdownMenuItem
      disabled={protectedTarget || !identity.data || identity.isError}
      title={
        protectedTarget
          ? t('users.accountPolicy.protectedTarget')
          : identity.isError
            ? t('users.accountPolicy.identityFailed')
            : undefined
      }
      onSelect={onSelect}
    >
      <ShieldCheck aria-hidden="true" />
      {t('users.accountPolicy.title')}
    </DropdownMenuItem>
  );
}
