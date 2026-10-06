import { cn } from '@/lib/utils';
import type { ShellLayoutProps } from './types';
import { useShellBreadcrumbs } from './use-shell-breadcrumbs';
import { ShellBreadcrumbs, ShellHeader } from '../widgets/ShellHeader';
import { SubsystemSwitcher } from '../widgets/SubsystemSwitcher';
import { GlobalSearch } from '../widgets/GlobalSearch';
import { NotificationBell } from '../widgets/NotificationBell';
import { HeaderActions } from '../widgets/HeaderActions';
import { NavMenuSidebar } from '../widgets/NavMenuSidebar';
import { PageTransition } from '@/components/pro/PageTransition';
import { PageFrameChromeProvider } from '@/components/pro/page-scaffold';

// 飞书经典：通栏 Header 在上，下方 = 侧栏树 + 内容区（原型 rootStyle 的列向分支）。
// Header 绝对定位覆于顶部，侧栏与 main 统一消费 Shell 高度 token。
// 面包屑独占内容区顶部一行（飞书后台式），底色同侧栏，与侧栏连成 L 形灰边，下方白色内容区；
// 文字左缘与白色内容区左缘对齐（不再加页边距，通栏页与普通页起点一致）。
export function SidebarLayout({
  menuTree,
  subsystems,
  collapsed,
  onCollapsedChange,
  children,
}: ShellLayoutProps) {
  const { breadcrumbs, chrome } = useShellBreadcrumbs();

  return (
    <div
      data-shell-layout="sidebar"
      className="h-screen relative flex w-full flex-col overflow-hidden bg-(--shell-side-bg) text-text"
    >
      <ShellHeader
        left={<SubsystemSwitcher subsystems={subsystems} variant="header" />}
        center={
          <>
            <GlobalSearch />
            <NotificationBell />
          </>
        }
        right={<HeaderActions />}
      />
      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'flex shrink-0 flex-col border-r border-border bg-chrome pt-(--shell-header-h) transition-[width] duration-200',
            collapsed ? 'w-(--shell-sidebar-collapsed-w)' : 'w-(--shell-sidebar-w)',
          )}
        >
          <NavMenuSidebar
            tree={menuTree}
            collapsed={collapsed}
            onToggle={() => onCollapsedChange(!collapsed)}
          />
        </aside>
        {/* 与 Pipeline 同构（各布局内容区体验一致）：主区自身不滚动，
            PageTransition 撑满并作兜底滚动容器：走 PageFrame 的页高度恰好撑满、在页内自己滚，
            不走 PageFrame 的页（dev 矩阵页等）由它滚动；表头与分页条始终在视口内 */}
        <main
          id="shell-main"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-(--shell-header-h)"
        >
          {breadcrumbs.length > 0 && (
            <div
              data-slot="shell-crumb-row"
              className="flex h-[calc(40px*var(--app-scale))] shrink-0 items-center bg-(--shell-side-bg) pl-0 pr-(--page-frame-px)"
            >
              <ShellBreadcrumbs breadcrumbs={breadcrumbs} />
            </div>
          )}
          <PageFrameChromeProvider value={chrome}>
            <PageTransition className="min-h-0 flex-1 overflow-y-auto bg-surface">{children}</PageTransition>
          </PageFrameChromeProvider>
        </main>
      </div>
    </div>
  );
}
