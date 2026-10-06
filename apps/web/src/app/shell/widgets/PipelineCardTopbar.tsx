import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import type { MenuNode } from '@/lib/menu-tree';
import type { Subsystem } from '@/lib/navigation';
import { PipelineSubsystemBrand } from './PipelineSubsystemBrand';

export function PipelineCardTopbar({
  tree,
  subsystem,
  actions,
  suffix,
}: {
  tree: MenuNode[];
  subsystem: Subsystem | undefined;
  actions?: ReactNode;
  suffix?: ReactNode;
}) {
  const { t, i18n } = useTranslation('admin');
  const pageLabel = (page: MenuNode) => {
    switch (page.path) {
      case '/admin/dashboard':
        return t('navigation.pages.dashboard');
      case '/admin/users':
        return t('navigation.pages.users');
      case '/admin/depts':
        return t('navigation.pages.depts');
      case '/admin/roles':
        return t('navigation.pages.roles');
      case '/admin/menus':
        return t('navigation.pages.menus');
      case '/admin/posts':
        return t('navigation.pages.posts');
      default:
        return lv(page.label, i18n.language);
    }
  };
  const { pathname, href } = useLocation();
  const nav = useNavigate();
  const [openGroup, setOpenGroup] = useState<{ id: string; href: string } | null>(null);
  const groups = tree
    .map((n) => ({ node: n, pages: (n.type === 'dir' ? (n.children ?? []) : [n]).filter((p) => p.path) }))
    .filter((g) => g.pages.length > 0);
  // 嵌套子路由（/admin/users/new、/admin/users/:id）按最长前缀归属到模块 tab；精确命中优先
  const activeGroup =
    groups.find((g) => g.pages.some((p) => p.path === pathname)) ??
    groups
      .map((g) => ({
        g,
        len: Math.max(
          0,
          ...g.pages.map((p) => (p.path && pathname.startsWith(`${p.path}/`) ? p.path.length : 0)),
        ),
      }))
      .filter((x) => x.len > 0)
      .sort((a, b) => b.len - a.len)[0]?.g;
  const activePage =
    activeGroup?.pages.find((p) => p.path === pathname) ??
    activeGroup?.pages
      .filter((p) => p.path && pathname.startsWith(`${p.path}/`))
      .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))[0];

  return (
    <div
      data-slot="pipeline-card-topbar"
      className="flex h-(--shell-header-h) shrink-0 items-center gap-[calc(16px*var(--app-scale))] border-b border-(--rail-card-divider) px-[calc(20px*var(--app-scale))]"
    >
      <PipelineSubsystemBrand subsystem={subsystem} />
      <div className="flex min-w-0 items-center gap-[calc(2px*var(--app-scale))] overflow-x-auto">
        {groups.map((g) => {
          const active = g === activeGroup;
          const first = g.pages[0];
          const dropdown = g.pages.length >= 2;
          const label = g.node.type === 'dir' ? lv(g.node.label, i18n.language) : pageLabel(g.node);
          const currentLabel =
            active && g.node.type === 'dir' && activePage ? pageLabel(activePage) : undefined;
          const button = (
            <button
              key={g.node.id}
              type="button"
              onClick={dropdown ? undefined : () => first?.path && void nav({ to: first.path })}
              aria-current={active ? 'page' : undefined}
              aria-label={currentLabel ? `${label} / ${currentLabel}` : label}
              className={cn(
                'flex h-(--rail-tab-h) shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-(--rail-tab-px) text-[calc(13.5px*var(--app-scale))] outline-none',
                'focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)',
                'hover:bg-(--tabs-seg-trigger-bg-active) data-[state=open]:bg-(--tabs-seg-trigger-bg-active)',
                active
                  ? 'bg-(--tabs-seg-trigger-bg-active) font-semibold text-(--tabs-seg-trigger-fg-active)'
                  : 'text-(--tabs-seg-trigger-fg)',
              )}
            >
              {label}
              {currentLabel && (
                <>
                  <span className="font-normal text-(--tabs-seg-trigger-fg)"> / </span>
                  <span className="max-w-[calc(160px*var(--app-scale))] truncate font-medium">
                    {currentLabel}
                  </span>
                </>
              )}
              {dropdown && (
                <ChevronDown aria-hidden="true" className="size-[calc(11px*var(--app-scale))] shrink-0" />
              )}
            </button>
          );
          if (!dropdown) return button;
          return (
            <DropdownMenu
              key={g.node.id}
              open={openGroup?.id === g.node.id && openGroup.href === href}
              onOpenChange={(open) => setOpenGroup(open ? { id: g.node.id, href } : null)}
              modal={false}
            >
              <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {g.pages.map((page) => (
                  <DropdownMenuItem
                    key={page.id}
                    aria-current={page === activePage ? 'page' : undefined}
                    onSelect={() => page.path && void nav({ to: page.path })}
                  >
                    <span className="flex size-3.5 items-center justify-center" aria-hidden="true">
                      {page === activePage && <Check className="size-3.5" />}
                    </span>
                    {pageLabel(page)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
      <div className="flex-1" />
      {actions}
      {suffix}
    </div>
  );
}
