import { useMemo, type ReactNode } from 'react';
import { useLocation } from '@tanstack/react-router';
import { buildMenuTree } from '@/lib/menu-tree';
import { useShellDeps } from './deps';
import { useAppearance } from '@/stores/appearance';
import { subsystemKeyFromPath } from './subsystem-key';
import { layoutRegistry } from './layouts/registry';
import { useCompactShell } from './use-compact-shell';
import { InterruptSlot } from './InterruptSlot';

// Shell 容器是登录后的业务稳定层：统一取数（子系统 / 菜单 / me）+ 组树，再按当前 layout 选布局并下发 props（spec §7.3）。
// 只要新页面继续挂在 /_auth 下，路由切换就只替换 children，不会重建整套 Header/Sidebar。
// 部件不感知布局、布局不取数——三层分离。
export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const subsystemKey = subsystemKeyFromPath(pathname);
  const { useSubsystems, useMenus, useCurrentUser } = useShellDeps();
  const subsystems = useSubsystems();
  const menus = useMenus(subsystemKey);
  const me = useCurrentUser();
  // 菜单过滤只提升体验和防误触，真正的权限边界仍然必须在后端校验。
  const menuTree = useMemo(() => buildMenuTree(menus, me), [menus, me]);

  const layout = useAppearance((s) => s.layout);
  const collapsed = useAppearance((s) => s.collapsed[layout] ?? false);
  const setCollapsed = useAppearance((s) => s.setCollapsed);
  const compact = useCompactShell();
  const Layout = compact ? layoutRegistry.sidebar : (layoutRegistry[layout] ?? layoutRegistry.sidebar);

  return (
    <Layout
      menuTree={menuTree}
      subsystems={subsystems}
      collapsed={compact || collapsed}
      onCollapsedChange={(next) => {
        if (!compact) setCollapsed(layout, next);
      }}
    >
      {/* 中断通条住内容区顶部（板：三种通条同一位置、只显示一条），随页面切换保留 */}
      <InterruptSlot />
      {children}
    </Layout>
  );
}
