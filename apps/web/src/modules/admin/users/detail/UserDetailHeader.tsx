import { DetailHeader, PagePaneToolbar } from '@/components/pro/page-scaffold';
import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { userDeptTreeQuery as deptTreeQuery, userDeptPathLabel as deptPathLabel } from '../api/dictionaries';
import { UserAvatar } from '../components/UserAvatar';
import { displayStatus, statusTone } from '../model';
import type { UserDetailDto } from '../api';

export function UserDetailHeader({ user, onBack }: { user: UserDetailDto; onBack: () => void }): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: depts = [] } = useQuery(deptTreeQuery);
  const status = displayStatus(user);
  const deptPath = deptPathLabel(depts, user.deptId);
  const subtitle = [user.employeeNo, user.account, deptPath, user.postName]
    .filter((part) => part && part !== '—')
    .join(' · ');

  return (
    <PagePaneToolbar
      variant="plain"
      data-slot="user-detail-header"
      className="flex shrink-0 items-center px-[calc(24px*var(--app-scale))] pt-[calc(16px*var(--app-scale))] pb-[calc(8px*var(--app-scale))]"
    >
      <DetailHeader
        variant="identity"
        className="w-full"
        title={user.name}
        avatar={<UserAvatar name={user.name} src={user.avatar} size="hero" />}
        subtitle={subtitle}
        subtitleMono
        status={
          <StatusBadge tone={statusTone(status)} showDot={false} className="shrink-0 whitespace-nowrap">
            {t(`users.status.${status}`)}
          </StatusBadge>
        }
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            {t('users.detail.returnToList')}
          </Button>
        }
      />
    </PagePaneToolbar>
  );
}
