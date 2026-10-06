import { useState, type JSX, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  EditableGrid,
  type EditableGridColumn,
  type EditableGridLabels,
} from '@/components/pro/EditableGrid';

// 可编辑表格状态矩阵（EditableGrid 三模式）。
// 说明：这是 dev-only 状态矩阵，示例文案与凭证分录夹具直接取自原型板
// DSAdditions.dc.html 4.8 的板上原文，作为夹具数据不进 i18n 资源；
// 组件本身的文案全部由 labels 注入。

interface EntryRow {
  id: string;
  summary: string;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
}

const gridLabels: EditableGridLabels = {
  edit: '编辑',
  save: '保存',
  cancel: '取消',
  delete: '删除',
  addRow: '添加一行',
  addRowHint: 'F8',
  actionsTitle: '操作',
};

/** 板 4.8：摘要 260 / 会计科目 占满 / 借贷金额各 130 / 操作 96（操作列由组件自持） */
function entryColumns(): EditableGridColumn<EntryRow>[] {
  return [
    {
      key: 'summary',
      title: '摘要',
      width: 260,
      render: (row) => (
        <span className={row.summary ? undefined : 'text-(--text-faint)'}>{row.summary || '请输入摘要'}</span>
      ),
      read: (row) => row.summary,
      write: (row, next) => ({ ...row, summary: next }),
    },
    {
      key: 'account',
      title: '会计科目',
      render: (row) =>
        row.accountCode ? (
          <span className="inline-flex items-center gap-[calc(8px*var(--app-scale))]">
            <span className="font-mono text-[calc(12.5px*var(--app-scale))] text-(--text-3)">
              {row.accountCode}
            </span>
            <span>{row.accountName}</span>
          </span>
        ) : (
          <span className="text-(--text-faint)">点击选择科目（F7）</span>
        ),
      read: (row) => (row.accountCode ? `${row.accountCode} ${row.accountName}` : ''),
      write: (row, next) => {
        const [code = '', ...rest] = next.split(' ');
        return { ...row, accountCode: code, accountName: rest.join(' ') };
      },
    },
    {
      key: 'debit',
      title: '借方金额',
      width: 130,
      align: 'right',
      mono: true,
      render: (row) => (row.debit ? row.debit : <span className="text-(--text-faint)">—</span>),
      read: (row) => row.debit,
      write: (row, next) => ({ ...row, debit: next }),
    },
    {
      key: 'credit',
      title: '贷方金额',
      width: 130,
      align: 'right',
      mono: true,
      render: (row) => (row.credit ? row.credit : <span className="text-(--text-faint)">—</span>),
      read: (row) => row.credit,
      write: (row, next) => ({ ...row, credit: next }),
    },
  ];
}

const rowModeRows: EntryRow[] = [
  {
    id: 'e1',
    summary: '收 8 月末端派送服务费',
    accountCode: '1122.03',
    accountName: '应收账款 - 云仓优选',
    debit: '12,600.00',
    credit: '',
  },
  {
    id: 'e2',
    summary: '〃',
    accountCode: '6001.02',
    accountName: '主营业务收入 - 尾程',
    debit: '',
    credit: '12,600.00',
  },
  {
    id: 'e3',
    summary: '运费附加费',
    accountCode: '6001.03',
    accountName: '主营业务收入 - 运费附加',
    debit: '3,000.00',
    credit: '',
  },
];

const cellModeRows: EntryRow[] = [
  rowModeRows[0] as EntryRow,
  rowModeRows[1] as EntryRow,
  { id: 'e4', summary: '', accountCode: '', accountName: '', debit: '0.00', credit: '0.00' },
];

const allModeRows: EntryRow[] = [
  rowModeRows[0] as EntryRow,
  {
    id: 'e2',
    summary: '〃',
    accountCode: '6001.02',
    accountName: '主营业务收入 - 尾程',
    debit: '',
    credit: '-500.00',
  },
  { id: 'e5', summary: '', accountCode: '', accountName: '', debit: '0.00', credit: '0.00' },
];

/** 板 4.8 多行编辑：金额须大于 0，错误格红环 + 下方红字，行高从 44 撑到 64 */
function validateEntry(row: EntryRow): Record<string, string> | null {
  if (row.credit.startsWith('-')) return { credit: '金额须大于 0' };
  if (row.debit.startsWith('-')) return { debit: '金额须大于 0' };
  return null;
}

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`editable.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

export default function EditableGridMatrix(): JSX.Element {
  const [rowEditing, setRowEditing] = useState<string[]>([]);

  return (
    <section
      data-testid="editableGridMatrix"
      className="mt-8 rounded-md border border-border bg-surface-2 p-4"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">可编辑表格状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">
          EditableGrid（单行 / 单元格 / 多行三模式 + 行内校验 + 合计条）
        </p>
      </div>

      <div className="grid gap-6">
        <Cell id="EditableGrid.row" title="单行编辑：点「编辑」整行变控件，同刻只允许一行">
          <EditableGrid
            mode="row"
            rows={rowModeRows}
            rowKey={(row) => row.id}
            columns={entryColumns()}
            labels={gridLabels}
            editingKeys={rowEditing}
            onEditingChange={setRowEditing}
            onSave={() => undefined}
            onDelete={() => undefined}
            onAdd={() => undefined}
            aria-label="凭证分录（单行编辑）"
          />
        </Cell>

        <Cell id="EditableGrid.cell" title="单元格编辑：点格即编、失焦即存，底栏常驻快捷键">
          <EditableGrid
            mode="cell"
            rows={cellModeRows}
            rowKey={(row) => row.id}
            columns={entryColumns()}
            labels={{ ...gridLabels, blurSavesHint: '失焦即保存' }}
            hotkeys={['Tab 下一格', 'Enter 下一行同列', 'Esc 还原本格', 'F7 选科目', 'F8 增行']}
            onSave={() => undefined}
            onDelete={() => undefined}
            aria-label="凭证分录（单元格编辑）"
          />
        </Cell>

        <Cell id="EditableGrid.all" title="多行编辑 · 校验：整表编辑态 + 错误行撑到 64 + 合计条">
          <EditableGrid
            mode="all"
            rows={allModeRows}
            rowKey={(row) => row.id}
            columns={entryColumns()}
            labels={{ ...gridLabels, addRowTop: '在顶部新增一行' }}
            validate={validateEntry}
            revealErrors="always"
            onSave={() => undefined}
            onDelete={() => undefined}
            onAdd={() => undefined}
            footer={
              <>
                <span className="font-semibold text-(--text)">合计</span>
                <span className="inline-flex h-[calc(22px*var(--app-scale))] items-center gap-[calc(5px*var(--app-scale))] rounded-(--badge-radius) bg-(--danger-soft) px-[calc(10px*var(--app-scale))] text-[calc(12px*var(--app-scale))] font-medium text-(--danger)">
                  1 处校验未通过 · 借贷差额 500.00
                </span>
                <span className="grow" />
                <Button variant="text" size="sm">
                  放弃全部
                </Button>
                <Button size="sm">保存 3 行</Button>
              </>
            }
            aria-label="凭证分录（多行编辑）"
          />
        </Cell>
      </div>
    </section>
  );
}
