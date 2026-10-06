/**
 * ListChrome —— 列表页表格上方工具区：一行工具条 + 按需 chips 行。
 *
 * 板 V2：padding 12px 20px；chips 行 margin-top 10。ListPageHeader 仍导出给其他包自行放进 toolbar。
 * pro 组件纪律：不 useTranslation、不 import @/modules/**，文案全部经 props 注入。
 */
import type { ReactNode } from 'react';
import { ToolbarIconActions, type ToolbarIconActionsOptions } from '@/components/pro/DataToolbar';
import { cn } from '@/lib/utils';

export interface ListPageHeaderProps {
  title: ReactNode;
  count?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ListPageHeader({ title, count, actions, className }: ListPageHeaderProps) {
  return (
    <div
      data-slot="list-page-header"
      className={cn(
        'flex h-[calc(36px*var(--app-scale))] items-center gap-[calc(10px*var(--app-scale))]',
        className,
      )}
    >
      <h1 className="text-[calc(18px*var(--app-scale))] font-semibold text-(--list-title-fg)">{title}</h1>
      {count !== undefined && (
        <span
          data-slot="list-page-header-count"
          className="text-[calc(13px*var(--app-scale))] text-(--list-count-fg)"
        >
          {count}
        </span>
      )}
      {actions !== undefined && (
        <div className="ml-auto flex items-center gap-[calc(10px*var(--app-scale))]">{actions}</div>
      )}
    </div>
  );
}

export interface ListToolbarProps extends ToolbarIconActionsOptions {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export function ListToolbar({
  leading,
  trailing,
  className,
  onRefresh,
  refreshing,
  fullscreen,
  labels,
}: ListToolbarProps) {
  // 传了 labels 且至少有一个动作才渲染右侧图标组
  const iconActions = !!labels && (!!onRefresh || !!fullscreen);

  return (
    <div
      data-slot="list-toolbar"
      className={cn('flex items-center gap-[calc(8px*var(--app-scale))]', className)}
    >
      {leading}
      <span className="flex-1" />
      {trailing}
      {iconActions ? (
        <ToolbarIconActions
          onRefresh={onRefresh}
          refreshing={refreshing}
          fullscreen={fullscreen}
          labels={labels}
        />
      ) : null}
    </div>
  );
}

export interface ListChromeProps {
  toolbar?: ReactNode;
  filters?: ReactNode;
  className?: string;
}

export function ListChrome({ toolbar, filters, className }: ListChromeProps) {
  return (
    <div
      data-slot="list-chrome"
      className={cn(
        'flex shrink-0 flex-col px-[calc(20px*var(--app-scale))] pt-[calc(12px*var(--app-scale))] pb-[calc(12px*var(--app-scale))]',
        className,
      )}
    >
      {toolbar !== undefined && toolbar !== null && toolbar !== false && (
        <div data-slot="list-chrome-toolbar">{toolbar}</div>
      )}
      {filters !== undefined && filters !== null && filters !== false && (
        <div data-slot="list-chrome-filters" className="mt-[calc(10px*var(--app-scale))]">
          {filters}
        </div>
      )}
    </div>
  );
}
