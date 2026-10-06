import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { authApi, meQuery } from '@/modules/admin/auth/api';
import { menusQuery, subsystemsQuery } from '@/modules/admin/menus/api';
import { unreadQuery } from '@/modules/admin/messages/api';
import { isDemoBuild } from '@/config';
import type { ShellDeps } from './shell/deps';

// 装配层：把 Shell 声明的依赖接到具体业务包。这是唯一允许「app → modules」的方向，
// 与 mount.tsx 同级——Shell 自身（app/shell/**）保持对业务包零依赖。

function useSubsystems() {
  return useSuspenseQuery(subsystemsQuery).data;
}

function useMenus(subsystemKey: string) {
  return useSuspenseQuery(menusQuery(subsystemKey)).data;
}

function useCurrentUser() {
  return useSuspenseQuery(meQuery).data;
}

function useUnreadCount() {
  const { data } = useQuery({ ...unreadQuery, refetchInterval: 30_000 });
  return data?.badgeEnabled ? data.count : 0;
}

export const shellDeps: ShellDeps = {
  useSubsystems,
  useMenus,
  useCurrentUser,
  logout: async () => {
    await authApi.logout();
  },
  messages: isDemoBuild ? null : { path: '/admin/messages', useUnreadCount },
};
