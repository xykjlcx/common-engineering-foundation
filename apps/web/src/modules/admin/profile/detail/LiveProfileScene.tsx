import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { KeyRound, Monitor, User } from 'lucide-react';
import { PageFrame } from '@/components/pro/page-scaffold';
import { SideList } from '@/components/pro/SideList';
import { resetSession } from '@/lib/reset-auth';
import { useInterrupt } from '@/stores/interrupt';
import type { ProfileTab } from '../types';
import { LiveProfileInfoPanel } from './LiveProfileInfoPanel';
import { LiveProfileIdentityCard } from './LiveProfileIdentityCard';
import { LiveProfileSecurityPanel } from './LiveProfileSecurityPanel';
import { liveSessionsQuery } from '../api/live-profile';
import { LiveProfileSessionsPanel } from './LiveProfileSessionsPanel';

export function LiveProfileScene({
  activeTab,
  onTabChange,
  onGoLogin,
  onChangePassword,
  passwordInitially = false,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onGoLogin: () => Promise<void>;
  onChangePassword: () => Promise<void>;
  passwordInitially?: boolean;
}) {
  const { t } = useTranslation('admin');
  const sessions = useQuery(liveSessionsQuery);
  const leaving = useRef(false);
  const passwordOpened = useRef(false);
  useEffect(() => {
    if (passwordInitially && !passwordOpened.current) {
      passwordOpened.current = true;
      void onChangePassword();
    }
  }, [passwordInitially, onChangePassword]);
  // 不 memo：全仓没有 React.memo，唯一消费方 LiveProfileSessionsPanel 只在 mutation onSuccess 里
  // 直接调它，身份稳定与否不影响任何 memo 或 effect。
  const leave = async () => {
    if (leaving.current) return;
    leaving.current = true;
    await onGoLogin();
    useInterrupt.getState().dismiss();
    await resetSession();
  };
  const tab = activeTab === 'preferences' ? 'info' : activeTab;
  return (
    <PageFrame
      className="p-0"
      breadcrumbs={[{ label: t('profile.breadcrumbGroup') }, { label: t('profile.title') }]}
    >
      <div className="grid min-h-0 flex-1 items-stretch lg:grid-cols-[auto_minmax(0,1fr)]">
        <SideList
          items={[
            { id: 'info', label: t('profile.tabs.info'), icon: <User /> },
            { id: 'security', label: t('profile.tabs.security'), icon: <KeyRound /> },
            {
              id: 'devices',
              label: t('profile.tabs.devices'),
              icon: <Monitor />,
              meta: sessions.data ? String(sessions.data.sessions.length) : undefined,
            },
          ]}
          activeId={tab}
          onSelect={(value) => onTabChange(value === 'security' || value === 'devices' ? value : 'info')}
        />
        <main className="grid min-w-0 content-start gap-4 px-8 py-5">
          <LiveProfileIdentityCard />
          {tab === 'info' && <LiveProfileInfoPanel />}
          {tab === 'devices' && <LiveProfileSessionsPanel onCurrentRevoked={leave} />}
          {(tab === 'info' || tab === 'security') && (
            <LiveProfileSecurityPanel
              onChangePassword={onChangePassword}
              onViewDevices={() => onTabChange('devices')}
            />
          )}
        </main>
      </div>
    </PageFrame>
  );
}
