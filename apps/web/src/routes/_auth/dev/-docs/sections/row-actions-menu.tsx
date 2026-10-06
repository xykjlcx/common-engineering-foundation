import type { JSX, ReactNode } from 'react';
import { Copy, Eye, FileCheck2, Pencil, Printer, Trash2, XCircle } from 'lucide-react';
import { RowActionsMenu, RowContextMenu } from '@/components/pro/RowActionsMenu';
import type { RowMenuItem } from '@/components/pro/row-menu';

// 行操作族状态矩阵（RowActionsMenu + RowContextMenu）。
// 说明：这是 dev-only 状态矩阵，示例文案直接取自原型板（RowMenuHover）的板上原文，
// 作为夹具数据不进 i18n 资源；组件本身的文案全部由 props 注入。

const noop = () => undefined;

const menuItems: RowMenuItem[] = [
  { id: 'view', label: '查看凭证', shortcut: 'Enter', icon: <Eye aria-hidden="true" />, onSelect: noop },
  { id: 'edit', label: '编辑', shortcut: 'E', icon: <Pencil aria-hidden="true" />, onSelect: noop },
  {
    id: 'audit',
    label: '审核',
    shortcut: 'F5',
    separatorBefore: true,
    icon: <FileCheck2 aria-hidden="true" />,
    onSelect: noop,
  },
  { id: 'post', label: '过账', icon: <FileCheck2 aria-hidden="true" />, onSelect: noop },
  {
    id: 'copy',
    label: '复制为新凭证',
    shortcut: '⌘D',
    separatorBefore: true,
    icon: <Copy aria-hidden="true" />,
    onSelect: noop,
  },
  { id: 'print', label: '打印', shortcut: '⌘P', icon: <Printer aria-hidden="true" />, onSelect: noop },
  {
    id: 'void',
    label: '作废',
    tone: 'danger',
    separatorBefore: true,
    icon: <XCircle aria-hidden="true" />,
    onSelect: noop,
  },
  { id: 'delete', label: '删除', disabled: true, icon: <Trash2 aria-hidden="true" />, onSelect: noop },
];

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`rowMenuPicker.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

/**
 * 模拟一行表格行。两个 class 都不能少：
 * `group/row` 让行尾三点钮随行 hover 显形；`ui-table-row` 提供行状态机变量 `--_table-row-bg`，
 * 渐变遮罩要吃它才能与行底同色（缺了它遮罩会回落 hover 底，在静止行上显成一条灰带）。
 */
function FakeRow({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="ui-table-row group/row flex h-[calc(32px*var(--app-scale))] items-center justify-between px-(--table-cell-px) text-[calc(13px*var(--app-scale))]">
      {children}
    </div>
  );
}

export default function RowActionsMenuMatrix(): JSX.Element {
  return (
    <section
      data-testid="rowActionsMenuMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">行操作族状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">
          RowActionsMenu（默认 / 显形 / 仅危险项 / 快捷键 / 空）· RowContextMenu
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Cell id="RowActionsMenu.default" title="行尾三点：默认（未 hover 不可见）">
            <FakeRow>
              <span>VCH-2026-0812</span>
              <RowActionsMenu items={menuItems} ariaLabel="更多操作" />
            </FakeRow>
          </Cell>

          <Cell id="RowActionsMenu.revealed" title="行尾三点：hover / focus 显形">
            <FakeRow>
              <span>VCH-2026-0813</span>
              <RowActionsMenu items={menuItems} ariaLabel="更多操作" revealed />
            </FakeRow>
          </Cell>

          <Cell id="RowActionsMenu.contextRow" title="整行右键：同一份 items">
            <RowContextMenu items={menuItems} asChild={false}>
              <div>
                <FakeRow>
                  <span>右键此行</span>
                  <RowActionsMenu items={menuItems} ariaLabel="更多操作" revealed />
                </FakeRow>
              </div>
            </RowContextMenu>
          </Cell>

          <Cell id="RowActionsMenu.dangerOnly" title="仅危险项 + 禁用项">
            <FakeRow>
              <span>VCH-2026-0814</span>
              <RowActionsMenu
                items={[menuItems[6] as RowMenuItem, menuItems[7] as RowMenuItem]}
                ariaLabel="更多操作"
                revealed
              />
            </FakeRow>
          </Cell>

          <Cell id="RowActionsMenu.shortcut" title="带快捷键提示">
            <FakeRow>
              <span>VCH-2026-0815</span>
              <RowActionsMenu
                items={[menuItems[0] as RowMenuItem, menuItems[1] as RowMenuItem]}
                ariaLabel="更多操作"
                revealed
              />
            </FakeRow>
          </Cell>

          <Cell id="RowActionsMenu.empty" title="无操作项：不渲染">
            <FakeRow>
              <span>VCH-2026-0816</span>
              <RowActionsMenu items={[]} ariaLabel="更多操作" revealed />
            </FakeRow>
          </Cell>
        </div>
      </div>
    </section>
  );
}
