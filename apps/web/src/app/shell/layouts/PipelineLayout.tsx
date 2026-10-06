import { useMemo, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { ShellLayoutProps } from './types';
import { useShellBreadcrumbs } from './use-shell-breadcrumbs';
import { AppearanceDrawer } from '../widgets/AppearanceDrawer';
import { NavMenuPipeline } from '../widgets/NavMenuPipeline';
import { PipelineBreadcrumbBar } from '../widgets/PipelineBreadcrumbBar';
import { PipelineCardTopbar } from '../widgets/PipelineCardTopbar';
import { PipelineRail } from '../widgets/PipelineRail';
import { PageTransition } from '@/components/pro/PageTransition';
import { PageFrameChromeProvider } from '@/components/pro/page-scaffold';
import { subsystemKeyFromPath } from '../subsystem-key';
import { lv } from '@/lib/localized';
import { cn } from '@/lib/utils';
import { useShellDeps } from '../deps';

// 统一基座布局（原型 design-explore/pipeline-board）：灰底 → 65px 子系统 rail → 近白浮卡。
// 浮卡内部形态由**子系统自己声明**（manifest.cardLayout）：
//   sidemenu — 卡内 263px 左菜单 + 46px 面包屑行（Main.dc.html），折叠钮在侧栏头部行 / 展开钮在面包屑行行首
//   stacked  — 卡内 52px 顶栏模块 tab（SysHome.dc.html / VouchersSharp.dc.html），无可折叠侧栏
// 面包屑归属随形态切换：sidemenu 走 shell header 接收端；stacked 按板关掉 PageFrame 那条
// （列表页无面包屑，表单/详情只留卡内 46px UserBreadcrumb）。
const FRAME_CHROME = { breadcrumbPlacement: 'none' as const };
const canvasStyle = { backgroundImage: 'var(--canvas-wallpaper)' };

export function PipelineLayout({
  menuTree,
  subsystems,
  collapsed,
  onCollapsedChange,
  children,
}: ShellLayoutProps) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const { messages } = useShellDeps();
  const globalInbox = !!messages && pathname.startsWith(messages.path);
  const { breadcrumbs, chrome } = useShellBreadcrumbs();
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const activeKey = subsystemKeyFromPath(pathname);
  const subsystem = useMemo(() => subsystems.find((s) => s.key === activeKey), [subsystems, activeKey]);
  // 没有菜单项就不摆空侧栏：dev 组件站等不在任何 manifest 里的路由，摆了会并排出现两条侧栏
  const sidemenu =
    !globalInbox && (subsystem?.cardLayout ?? 'sidemenu') === 'sidemenu' && menuTree.length > 0;
  // 既无子系统也无菜单（dev 组件站这类不在 manifest 里的路由）：顶栏 / 面包屑行都不摆，内容直接占满浮卡
  const bareCard = globalInbox || (!subsystem && menuTree.length === 0);
  const showSidebar = sidemenu && !collapsed;

  // 板上面包屑不含子系统名（Main：⌂ / 运单作业 / 运单流水线；RailCollapsed 的子系统身份是行首
  // 独立分段而非 crumb）。示例页面为其他布局把子系统名声明成首项 crumb——本布局按标签匹配滤掉，
  // 避免折叠态与身份分段重复、展开态与板不符。
  const subsystemLabel = subsystem ? lv(subsystem.label, i18n.language) : undefined;
  const cardBreadcrumbs = useMemo(
    () => (subsystemLabel && breadcrumbs[0]?.label === subsystemLabel ? breadcrumbs.slice(1) : breadcrumbs),
    [breadcrumbs, subsystemLabel],
  );

  return (
    <div
      data-shell-layout="pipeline"
      data-card-layout={sidemenu ? 'sidemenu' : 'stacked'}
      className="h-screen flex w-full overflow-hidden bg-canvas text-text"
      // 壁纸只在 flavor 开启毛玻璃分层时存在（base 为 none），见 tokens --canvas-wallpaper
      style={canvasStyle}
    >
      <PipelineRail subsystems={subsystems} onOpenPreferences={() => setAppearanceOpen(true)} />
      {/* 浮卡：四周统一 --shell-card-gap 留白、圆角、发丝边、极轻阴影（原板 Main.dc.html L49 为上右下 10 左 0，2026-10-05 收窄并等距） */}
      <div
        data-slot="pipeline-card"
        className="m-(--shell-card-gap) flex min-w-0 flex-1 overflow-hidden rounded-(--card-radius) border border-(--rail-card-border) bg-(--rail-card-bg) shadow-(--rail-card-shadow) backdrop-blur-(--glass-blur)"
      >
        {/* 侧栏折叠是宽度动画不是卸载：外层只动 width（263→0）并裁切，内层定宽不回流、只做淡隐，
            文字不会被挤着换行。折叠态 inert + aria-hidden 掐掉焦点与无障碍树（同 NavMenuInset）。 */}
        {sidemenu && (
          <div
            data-slot="pipeline-card-sidebar-slot"
            data-state={showSidebar ? 'expanded' : 'collapsed'}
            aria-hidden={!showSidebar || undefined}
            inert={!showSidebar || undefined}
            className={cn(
              'shrink-0 overflow-hidden transition-[width] duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
              showSidebar ? 'w-(--rail-card-sidebar-w)' : 'w-0',
            )}
          >
            <div
              className={cn(
                'h-full w-(--rail-card-sidebar-w) transition-opacity ease-out motion-reduce:transition-none',
                showSidebar ? 'opacity-100 delay-[60ms] duration-[200ms]' : 'opacity-0 duration-[120ms]',
              )}
            >
              <NavMenuPipeline
                tree={menuTree}
                subsystem={subsystem}
                onOpenSearch={() => toast(t('shell.toast.search'))}
                onCollapse={() => onCollapsedChange(true)}
              />
            </div>
          </div>
        )}
        <div
          className={
            sidemenu
              ? 'flex min-w-0 flex-1 flex-col bg-(--rail-content-glass-bg)'
              : 'flex min-w-0 flex-1 flex-col'
          }
        >
          {bareCard ? null : sidemenu ? (
            <PipelineBreadcrumbBar
              breadcrumbs={cardBreadcrumbs}
              // 侧栏折叠后子系统身份回落到面包屑行行首（RailCollapsed.dc.html）
              brand={collapsed ? subsystem : undefined}
              onExpand={collapsed ? () => onCollapsedChange(false) : undefined}
            />
          ) : (
            <PipelineCardTopbar tree={menuTree} subsystem={subsystem} />
          )}
          <main id="shell-main" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <PageFrameChromeProvider value={sidemenu ? chrome : FRAME_CHROME}>
              <PageTransition className="min-h-0 flex-1 overflow-y-auto">{children}</PageTransition>
            </PageFrameChromeProvider>
          </main>
        </div>
      </div>
      {/* 偏好设置的临时挂点：抽屉必须住布局层，个人菜单一关就会卸载它自己的内容树 */}
      <AppearanceDrawer open={appearanceOpen} onOpenChange={setAppearanceOpen} hideTrigger />
    </div>
  );
}
