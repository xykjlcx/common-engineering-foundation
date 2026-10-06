/**
 * 右键上下文菜单原语。
 *
 * 来源登记（CLAUDE.md「组件第一抄袭源 coss/ui」条款）：
 * - 结构与 token 消费**镜像本仓库 `components/ui/dropdown-menu.tsx`**（同一套
 *   `--menu-item-*` / `--overlay-*` / `--overlay-radius` / `--overlay-shadow-popover`），
 *   保证行操作的两个入口（行尾三点 / 右键）视觉与状态完全一致。
 * - 对照过 coss/ui `apps/ui/registry/default/ui/context-menu.tsx`（MIT，cosscom/coss）：
 *   它走 `@base-ui/react/context-menu`，与本项目 dropdown/select/popover 的 Radix 系不同族。
 *   按「同一交互域内不混用两套 primitives」裁决**不换 primitives**，只吸收两处细节：
 *   ① Shortcut 用语义化 `<kbd>` 而非 `<span>`；② Item 的 svg 选择器只作用于直接子元素。
 */
import * as React from 'react';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function ContextMenu({ ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger({ ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function ContextMenuPortal({ ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />;
}

function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(
          'anim-modal-in z-50 max-h-(--radix-context-menu-content-available-height) min-w-[calc(8rem*var(--app-scale))] overflow-x-hidden overflow-y-auto rounded-(--overlay-radius) border border-(--overlay-border) bg-(--overlay-bg) p-1 text-(--overlay-fg) shadow-(--overlay-shadow-popover)',
          className,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuGroup({ ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

function ContextMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex min-h-[calc(32px*var(--app-scale))] cursor-pointer items-center gap-2 rounded-7 px-2 py-1 text-sm text-(--menu-item-fg) outline-hidden select-none focus:bg-(--menu-item-bg-highlighted) focus:text-(--menu-item-fg-highlighted) data-[highlighted]:bg-(--menu-item-bg-highlighted) data-[highlighted]:text-(--menu-item-fg-highlighted) data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-(--menu-item-fg-danger) data-[variant=destructive]:focus:bg-(--menu-item-bg-danger-highlighted) data-[variant=destructive]:focus:text-(--menu-item-fg-danger) data-[variant=destructive]:data-[highlighted]:bg-(--menu-item-bg-danger-highlighted) data-[variant=destructive]:data-[highlighted]:text-(--menu-item-fg-danger) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-(--menu-item-muted-fg) data-[variant=destructive]:[&_svg]:text-(--menu-item-fg-danger)",
        className,
      )}
      {...props}
    />
  );
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', className)}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

/** 快捷键提示。coss/ui 用 `<kbd>`（语义化 + 读屏可识别），本项目采纳。 */
function ContextMenuShortcut({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="context-menu-shortcut"
      className={cn('ml-auto font-sans text-xs tracking-widest text-(--menu-item-shortcut-fg)', className)}
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
};
