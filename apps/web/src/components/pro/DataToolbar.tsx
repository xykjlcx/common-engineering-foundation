/**
 * DataToolbar —— 列表页紧凑工具条容器 + 右侧图标动作组（刷新 / 全屏）。
 *
 * 抄袭源：ant-design-pro ProTable toolbar 的「刷新 · 密度 · 列设置 · 全屏」四钮语义
 * + 本仓 ui/button.tsx(ghost/icon) 与 ui/tooltip.tsx 改造落 token。
 * 板：design-explore/pipeline-board/DSAdditions.dc.html 4.9「表格工具栏补件」——
 * 图标钮 32px（--control-btn-md）、同组间距 2、图标 15px、hover 底走 --button-icon-bg-hover、
 * 深色 tooltip 在钮下方 6px。
 *
 * pro 组件纪律：不 useTranslation、不 import @/modules/**，文案全部经 labels 注入。
 */
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Maximize, Minimize, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ToolbarIconActionsLabels {
  refresh: string;
  fullscreen: string;
  exitFullscreen: string;
}

export interface ToolbarFullscreenState {
  active: boolean;
  onToggle: () => void;
}

/** 工具条上「刷新 / 全屏」两个可选图标钮的公共入参（DataToolbar 与 ListToolbar 都平铺这几项） */
export interface ToolbarIconActionsOptions {
  /** 刷新回调。返回 Promise 时图标自动转圈到 resolve/reject 为止 */
  onRefresh?: () => void | Promise<unknown>;
  /** 外部受控的转圈态；显式传入时优先于内部跟 Promise 的自动态 */
  refreshing?: boolean;
  fullscreen?: ToolbarFullscreenState;
  /** 三个图标钮的无障碍名 + tooltip 文案；缺省时整组不渲染 */
  labels?: ToolbarIconActionsLabels;
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' && value !== null && typeof (value as Promise<unknown>).then === 'function'
  );
}

export function ToolbarIconActions({
  onRefresh,
  refreshing,
  fullscreen,
  labels,
  children,
  className,
}: ToolbarIconActionsOptions & { children?: ReactNode; className?: string }) {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const spinning = refreshing ?? pending;

  const runRefresh = () => {
    const result = onRefresh?.();
    if (!isPromiseLike(result)) return;
    setPending(true);
    void result.then(
      () => {
        if (mounted.current) setPending(false);
      },
      () => {
        if (mounted.current) setPending(false);
      },
    );
  };

  const fullscreenLabel = fullscreen?.active ? labels?.exitFullscreen : labels?.fullscreen;

  return (
    <span
      data-slot="toolbar-icon-actions"
      className={cn('inline-flex items-center gap-[calc(2px*var(--app-scale))]', className)}
    >
      {onRefresh && labels ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-slot="toolbar-refresh"
              data-refreshing={spinning || undefined}
              aria-label={labels.refresh}
              aria-busy={spinning || undefined}
              onClick={runRefresh}
            >
              <RotateCw data-icon="only" aria-hidden="true" className={cn(spinning && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {labels.refresh}
          </TooltipContent>
        </Tooltip>
      ) : null}

      {children}

      {fullscreen && fullscreenLabel ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-slot="toolbar-fullscreen"
              data-active={fullscreen.active || undefined}
              aria-label={fullscreenLabel}
              aria-pressed={fullscreen.active}
              onClick={fullscreen.onToggle}
            >
              {fullscreen.active ? (
                <Minimize data-icon="only" aria-hidden="true" />
              ) : (
                <Maximize data-icon="only" aria-hidden="true" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {fullscreenLabel}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

export function DataToolbar({
  variant = 'plain',
  className,
  children,
  onRefresh,
  refreshing,
  fullscreen,
  labels,
  ...props
}: ComponentProps<'div'> & { variant?: 'plain' | 'surface' } & ToolbarIconActionsOptions) {
  // 传了 labels 且至少有一个动作才渲染右侧图标组
  const iconActions = !!labels && (!!onRefresh || !!fullscreen);

  return (
    <div
      data-slot="data-toolbar"
      data-variant={variant}
      role="toolbar"
      className={cn(
        'flex min-h-[calc(46px*var(--app-scale))] flex-wrap items-center gap-[calc(8px*var(--app-scale))] px-[calc(12px*var(--app-scale))] py-[calc(8px*var(--app-scale))]',
        variant === 'surface' && 'border-b border-(--page-section-divider) bg-(--pro-toolbar-bg)',
        className,
      )}
      {...props}
    >
      {children}
      {iconActions ? (
        <DataToolbarGroup align="end">
          <ToolbarIconActions
            onRefresh={onRefresh}
            refreshing={refreshing}
            fullscreen={fullscreen}
            labels={labels}
          />
        </DataToolbarGroup>
      ) : null}
    </div>
  );
}

export function DataToolbarGroup({
  align = 'start',
  className,
  ...props
}: ComponentProps<'div'> & { align?: 'start' | 'end' }) {
  return (
    <div
      data-slot="data-toolbar-group"
      data-align={align}
      role="group"
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-[calc(8px*var(--app-scale))]',
        align === 'end' && 'ml-auto justify-end',
        className,
      )}
      {...props}
    />
  );
}

export interface SummaryStripItem {
  label: ReactNode;
  value: ReactNode;
}

export function SummaryStrip({
  items,
  className,
  ...props
}: Omit<ComponentProps<'dl'>, 'children'> & { items: SummaryStripItem[] }) {
  return (
    <dl
      data-slot="summary-strip"
      className={cn(
        'flex min-h-[calc(42px*var(--app-scale))] flex-wrap items-stretch overflow-hidden rounded-10 border border-(--page-section-divider) bg-(--pro-toolbar-bg)',
        className,
      )}
      {...props}
    >
      {items.map((item, index) => (
        <div
          key={index}
          data-slot="summary-strip-item"
          className="flex min-w-[calc(144px*var(--app-scale))] flex-1 items-center gap-[calc(8px*var(--app-scale))] border-r border-(--page-section-divider) px-[calc(12px*var(--app-scale))] py-[calc(8px*var(--app-scale))] last:border-r-0"
        >
          <dt className="truncate text-xs text-text-3">{item.label}</dt>
          <dd className="ml-auto text-sm font-semibold tabular-nums text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
