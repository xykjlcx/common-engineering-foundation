import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { UsersScene } from './list/UsersScene';
import type { UsersSearch } from './types';
import type { UsersQueryParams } from './api';

export { UserImportDialog } from './list/UserImportDialog';
export { UserAvatar } from './components/UserAvatar';

/* —— 谁消费谁请求，靠 query key 去重复用缓存。 */
export function UsersPage({
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

  return (
    <PageFrame
      flush
      breadcrumbs={[{ label: t('users.breadcrumbGroup') }, { label: t('users.title') }]}
      className="min-h-0"
    >
      <PageSurface>
        <UsersScene
          permissions={permissions}
          systemAdmin={systemAdmin}
          search={search}
          onSearchChange={onSearchChange}
          onOpenUser={onOpenUser}
          onCreateUser={onCreateUser}
          onEditUser={onEditUser}
        />
      </PageSurface>
    </PageFrame>
  );
}

export { UsersMoveDialog } from './components/UsersMoveDialog';
