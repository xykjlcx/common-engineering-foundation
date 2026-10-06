import { LiveProfileScene } from './detail/LiveProfileScene';
import { useState } from 'react';
import type { ProfileTab } from './types';

export function ProfilePage({
  initialTab = 'info',
  tab,
  action,
  onTabChange,
  onGoLogin,
  onChangePassword,
}: {
  permissions?: string[];
  onGoLogin: () => Promise<void>;
  onChangePassword: () => Promise<void>;
  initialTab?: ProfileTab;
  tab?: ProfileTab;
  action?: 'password';
  onTabChange?: (tab: ProfileTab) => void;
}) {
  const [localTab, setLocalTab] = useState(initialTab);
  const activeTab = tab ?? localTab;
  const changeTab = (next: ProfileTab) => {
    setLocalTab(next);
    onTabChange?.(next);
  };
  return (
    <LiveProfileScene
      activeTab={activeTab}
      onTabChange={changeTab}
      onGoLogin={onGoLogin}
      onChangePassword={onChangePassword}
      passwordInitially={activeTab === 'security' && action === 'password'}
    />
  );
}
