import { createContext, useContext } from 'react';
import type { AuthzContext } from '@/lib/permission';
import type { MenuRecord, RoutePath, Subsystem } from '@/lib/navigation';

// Shell 依赖契约：Shell 与各 widget 只声明「需要什么」，由 app/shell-deps.ts（装配层）填入具体业务包。
// 依赖方向因此保持自上而下——app/shell 不 import @/modules/**，守卫
// module-boundaries.test.ts「UI/Pro/Shell 生产源码不得反向依赖业务模块」钉住这一点。

export interface ShellUser extends AuthzContext {
  name: string;
  username: string;
}

export interface ShellMessagesDeps {
  path: RoutePath;
  useUnreadCount: () => number;
}

export interface ShellDeps {
  useSubsystems: () => Subsystem[];
  useMenus: (subsystemKey: string) => MenuRecord[];
  useCurrentUser: () => ShellUser;
  /** 只吊销服务端会话；导航与缓存清理由调用方按时序自己做（见 lib/reset-auth 的时序纪律） */
  logout: () => Promise<void>;
  /** null = 本构建未接入消息中心：铃铛与 rail 消息位整体不渲染，也不挂查询 */
  messages: ShellMessagesDeps | null;
}

const ShellDepsContext = createContext<ShellDeps | null>(null);

export const ShellDepsProvider = ShellDepsContext.Provider;

export function useShellDeps(): ShellDeps {
  const deps = useContext(ShellDepsContext);
  if (!deps) throw new Error('Shell 必须渲染在 ShellDepsProvider 内（装配见 app/shell-deps.ts）');
  return deps;
}
