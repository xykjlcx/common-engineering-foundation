import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import type { MenuNode } from '@/lib/menu-tree';
import type { Subsystem } from '@/lib/navigation';
import { featuresConfig } from '@/config';
import { PipelineSubsystemBrand } from './PipelineSubsystemBrand';
import { SidebarToggle } from './SidebarToggle';

// 卡内左菜单（原型 Main.dc.html L52-112）：263px 侧栏 = 54px 子系统头 + 34px 菜单搜索 + 分组菜单树。
// 分组标题不可点（板上是纯文字，不是可折叠 dir）；激活项 = 药丸底 + 卡左缘 3px 橙指示条。
// 折叠入口住侧栏头部行右端（折叠钮控制的是这张浮卡内部的布局，不该放全局 rail 上）；
// 折叠后侧栏整段消失，展开入口由 PipelineBreadcrumbBar 在面包屑行行首接手，两处位置连续都在左上角。
export function NavMenuPipeline({
  tree,
  subsystem,
  onOpenSearch,
  onCollapse,
}: {
  tree: MenuNode[];
  subsystem: Subsystem | undefined;
  onOpenSearch: () => void;
  onCollapse?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const groups = tree.map((n) => ({ node: n, pages: n.children?.length ? n.children : [n] }));

  return (
    <aside
      data-slot="pipeline-card-sidebar"
      className="flex h-full w-(--rail-card-sidebar-w) shrink-0 flex-col border-r border-(--rail-card-divider) bg-(--rail-card-sidebar-bg)"
    >
      <div className="flex h-(--rail-card-head-h) shrink-0 items-center gap-[calc(8px*var(--app-scale))] pl-[calc(16px*var(--app-scale))] pr-[calc(10px*var(--app-scale))]">
        <PipelineSubsystemBrand subsystem={subsystem} />
        <div className="flex-1" />
        {onCollapse && (
          <SidebarToggle label={t('shell.nav.collapse')} icon={PanelLeftClose} onClick={onCollapse} />
        )}
      </div>

      {/* 菜单搜索：板上是静态占位条。真实搜索未接入前只在开发/demo 显示，
          与 GlobalSearch 同一条纪律（生产交付不露假功能）。 */}
      {featuresConfig.showStubChrome && (
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label={t('shell.search')}
          className="mx-[calc(14px*var(--app-scale))] mb-[calc(6px*var(--app-scale))] mt-[calc(2px*var(--app-scale))] flex h-(--rail-search-h) shrink-0 items-center gap-[calc(8px*var(--app-scale))] rounded-md border border-(--field-border) bg-(--field-bg) px-[calc(11px*var(--app-scale))] outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)"
        >
          <Search className="size-[calc(14px*var(--app-scale))] shrink-0 text-(--field-placeholder) [stroke-width:var(--rail-menu-icon-stroke)]" />
          <span className="flex-1 truncate text-left text-[calc(13px*var(--app-scale))] text-(--field-placeholder)">
            {t('shell.pipeline.searchPlaceholder')}
          </span>
          <span className="text-[calc(12px*var(--app-scale))] tracking-[0.04em] text-(--menu-item-muted-fg)">
            ⌘ K
          </span>
        </button>
      )}

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[calc(14px*var(--app-scale))] pb-[calc(12px*var(--app-scale))] pt-[calc(4px*var(--app-scale))]">
        {groups.map((g, index) => (
          <div key={g.node.id}>
            <div
              className={cn(
                'px-[calc(10px*var(--app-scale))] pb-[calc(7px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))] text-(--rail-menu-group-fg)',
                // 板值：首组上边距 14px，其余组 16px
                index === 0 ? 'pt-[calc(14px*var(--app-scale))]' : 'pt-[calc(16px*var(--app-scale))]',
              )}
            >
              {lv(g.node.label, i18n.language)}
            </div>
            <div className="flex flex-col gap-[calc(2px*var(--app-scale))]">
              {g.pages.map((p) => {
                if (!p.path) return null;
                const active = pathname === p.path;
                return (
                  <Link
                    key={p.id}
                    to={p.path}
                    className={cn(
                      'relative flex h-(--nav-item-h) items-center gap-[calc(10px*var(--app-scale))] rounded-md px-[calc(10px*var(--app-scale))] text-[calc(14px*var(--app-scale))]',
                      active
                        ? 'bg-(--rail-menu-bg-current) font-semibold text-(--rail-menu-fg-current)'
                        : 'text-(--type-2-fg) hover:bg-(--rail-menu-bg-hover)',
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        // 板值 left:-15px = 侧栏内距 14px + 浮卡 1px 边框，指示条回到卡左缘
                        className="absolute -left-[calc(15px*var(--app-scale))] top-[calc(5px*var(--app-scale))] h-[calc(26px*var(--app-scale))] w-(--rail-indicator-w) rounded-r-full bg-(--rail-menu-indicator)"
                      />
                    )}
                    <Icon
                      name={p.icon ?? g.node.icon}
                      className={cn(
                        'size-(--nav-icon-size) shrink-0 [stroke-width:var(--rail-menu-icon-stroke)]',
                        !active && 'text-(--rail-menu-icon-fg)',
                      )}
                    />
                    <span className="truncate">{lv(p.label, i18n.language)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
