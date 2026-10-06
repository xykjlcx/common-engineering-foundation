import { Fragment, type CSSProperties, type JSX, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { RowMenuItem } from './row-menu';

const rowMenuContentClass = 'w-[calc(188px*var(--app-scale))] px-0 py-[calc(5px*var(--app-scale))]';
const rowMenuItemClass =
  'min-h-[calc(30px*var(--app-scale))] gap-[calc(9px*var(--app-scale))] rounded-none px-[calc(11px*var(--app-scale))] py-0 text-[calc(13px*var(--app-scale))]';
const rowMenuSeparatorClass = 'mx-0 my-[calc(5px*var(--app-scale))] bg-(--surface-2)';

const rowMenuShortcutClass = 'font-mono text-[calc(11px*var(--app-scale))] tracking-normal';

const rowMaskStyle: CSSProperties = {
  background: 'linear-gradient(90deg, transparent 0%, var(--_table-row-bg, var(--table-row-bg-hover)) 22%)',
};

export interface RowActionsMenuProps {
  items: RowMenuItem[];
  /** 三点按钮的可访问名（pro 层不做 i18n，文案由外部注入） */
  ariaLabel: string;
  /**
   * 强制常显。默认只在祖先 `.group/row` hover、自身 hover/focus-within、菜单展开时可见；
   * 状态矩阵与无 hover 上下文的场景用它固定展示。
   */
  revealed?: boolean;

  mask?: boolean;
  className?: string;
}

export interface RowContextMenuProps {
  items: RowMenuItem[];
  /** 右键落点元素（通常是整行 `<tr>`），必须能接收 props */
  children: ReactNode;
  asChild?: boolean;
}

function renderRowMenuItems(
  items: RowMenuItem[],
  Item: typeof DropdownMenuItem | typeof ContextMenuItem,
  Separator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator,
  Shortcut: typeof DropdownMenuShortcut | typeof ContextMenuShortcut,
) {
  return items.map((item) => (
    <Fragment key={item.id}>
      {item.separatorBefore && <Separator className={rowMenuSeparatorClass} />}
      <Item
        data-row-menu-item={item.id}
        variant={item.tone === 'danger' ? 'destructive' : 'default'}
        disabled={item.disabled}
        onSelect={item.onSelect}
        className={rowMenuItemClass}
      >
        {item.icon}
        <span className="truncate">{item.label}</span>
        {item.shortcut && <Shortcut className={rowMenuShortcutClass}>{item.shortcut}</Shortcut>}
      </Item>
    </Fragment>
  ));
}

export function RowActionsMenu({
  items,
  ariaLabel,
  revealed = false,
  mask = true,
  className,
}: RowActionsMenuProps): JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <div data-slot="row-actions-menu" className={cn('relative flex items-center justify-end', className)}>
      {mask && (
        <span
          aria-hidden="true"
          data-slot="row-actions-mask"
          data-revealed={revealed || undefined}
          style={rowMaskStyle}
          className="pointer-events-none absolute top-1/2 right-0 h-[calc(31px*var(--app-scale))] w-[calc(93px*var(--app-scale))] -translate-y-1/2 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 data-[revealed]:opacity-100"
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            data-slot="row-actions-trigger"
            data-revealed={revealed || undefined}
            className="relative inline-flex size-[calc(26px*var(--app-scale))] cursor-pointer items-center justify-center rounded-md border border-(--row-menu-trigger-border) bg-(--row-menu-trigger-bg) text-(--type-2-fg) opacity-0 shadow-(--row-menu-trigger-shadow) transition-opacity outline-none group-hover/row:opacity-100 group-focus-within/row:opacity-100 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus) data-[revealed]:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal aria-hidden="true" className="size-[calc(14px*var(--app-scale))]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={rowMenuContentClass}>
          {renderRowMenuItems(items, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RowContextMenu({ items, children, asChild = true }: RowContextMenuProps): JSX.Element {
  if (items.length === 0) return <>{children}</>;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild={asChild}>{children}</ContextMenuTrigger>
      <ContextMenuContent className={rowMenuContentClass}>
        {renderRowMenuItems(items, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut)}
      </ContextMenuContent>
    </ContextMenu>
  );
}
