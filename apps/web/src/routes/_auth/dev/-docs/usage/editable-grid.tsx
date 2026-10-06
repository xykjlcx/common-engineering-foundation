import { useState } from 'react';
import {
  EditableGrid,
  type EditableGridColumn,
  type EditableGridLabels,
} from '@/components/pro/EditableGrid';
import type { UsageDoc } from '../types';

/* 可编辑表格「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

interface FeeRow {
  id: string;
  name: string;
  amount: string;
}

const labels: EditableGridLabels = {
  edit: '编辑',
  save: '保存',
  cancel: '取消',
  delete: '删除',
  addRow: '添加一行',
  addRowHint: 'F8',
  actionsTitle: '操作',
};

const feeColumns: EditableGridColumn<FeeRow>[] = [
  {
    key: 'name',
    title: '费用名称',
    width: 220,
    render: (row) => row.name,
    read: (row) => row.name,
    write: (row, next) => ({ ...row, name: next }),
  },
  {
    key: 'amount',
    title: '金额',
    width: 140,
    align: 'right',
    mono: true,
    render: (row) => row.amount,
    read: (row) => row.amount,
    write: (row, next) => ({ ...row, amount: next }),
  },
];

const initialRows: FeeRow[] = [
  { id: 'f1', name: '末端派送费', amount: '12,600.00' },
  { id: 'f2', name: '仓储服务费', amount: '3,000.00' },
  { id: 'f3', name: '报关代理费', amount: '800.00' },
];

function RowModeDemo() {
  const [rows, setRows] = useState(initialRows);
  const [seed, setSeed] = useState(0);

  return (
    <EditableGrid
      aria-label="费用明细（整行编辑）"
      columns={feeColumns}
      rows={rows}
      rowKey={(row) => row.id}
      labels={labels}
      onSave={(row) => setRows((current) => current.map((item) => (item.id === row.id ? row : item)))}
      onDelete={(row) => setRows((current) => current.filter((item) => item.id !== row.id))}
      onAdd={() => {
        setSeed(seed + 1);
        setRows((current) => [...current, { id: `new-${seed + 1}`, name: '', amount: '' }]);
      }}
    />
  );
}

function CellModeDemo() {
  const [rows, setRows] = useState(initialRows);

  return (
    <EditableGrid
      mode="cell"
      aria-label="费用明细（点格即编）"
      columns={feeColumns}
      rows={rows}
      rowKey={(row) => row.id}
      labels={{ ...labels, blurSavesHint: '失焦即保存' }}
      hotkeys={['Tab 下一格', 'Enter 下一行', 'Esc 放弃本格']}
      onSave={(row) => setRows((current) => current.map((item) => (item.id === row.id ? row : item)))}
    />
  );
}

function AllModeDemo() {
  const [rows, setRows] = useState(initialRows);

  return (
    <EditableGrid
      mode="all"
      revealErrors="always"
      aria-label="费用明细（整表编辑）"
      columns={feeColumns}
      rows={rows}
      rowKey={(row) => row.id}
      labels={labels}
      validate={(row) => (row.name.trim() ? null : { name: '费用名称必填' })}
      footer={
        <div className="flex items-center justify-between px-3 py-2 text-xs text-(--type-2-fg)">
          <span>合计 {rows.length} 行</span>
          <span>校验未通过 {rows.filter((row) => !row.name.trim()).length} 行</span>
        </div>
      }
      onSave={(row) => setRows((current) => current.map((item) => (item.id === row.id ? row : item)))}
    />
  );
}

export const usage: UsageDoc = {
  when:
    '需要用户在表格里直接改数据、而不是一行一行弹窗的场景用 EditableGrid，三种 mode 对应三种录入节奏：' +
    'mode="row"（默认）点「编辑」整行变控件、改完点保存，适合偶尔修一两行的配置表；' +
    'mode="cell" 点哪格编哪格、失焦即存，适合核对与批量微调，是最接近 Excel 的一档；' +
    'mode="all" 整表常驻编辑态，适合凭证分录、报价明细这类「一次录一整批」的表单式表格，配 footer 放合计与批量保存。' +
    '只读列表用 pro/DataTable，详情页的就地改单个字段用 pro/DescriptionList 的 editable 档，都不要拿 EditableGrid 硬凑。',
  examples: [
    {
      title: 'row 模式：整行编辑',
      description:
        '一列同时给了 read 和 write 才可编辑，只给 render 的列在编辑行里仍是只读；编辑中的草稿由组件自持，保存时才回吐整行。',
      code: `import { useState } from 'react';
import {
  EditableGrid,
  type EditableGridColumn,
  type EditableGridLabels,
} from '@/components/pro/EditableGrid';

interface FeeRow {
  id: string;
  name: string;
  amount: string;
}

const labels: EditableGridLabels = {
  edit: '编辑',
  save: '保存',
  cancel: '取消',
  delete: '删除',
  addRow: '添加一行',
  addRowHint: 'F8',
  actionsTitle: '操作',
};

const columns: EditableGridColumn<FeeRow>[] = [
  {
    key: 'name',
    title: '费用名称',
    width: 220,
    render: (row) => row.name,
    read: (row) => row.name,
    write: (row, next) => ({ ...row, name: next }),
  },
  {
    key: 'amount',
    title: '金额',
    width: 140,
    align: 'right',
    mono: true,
    render: (row) => row.amount,
    read: (row) => row.amount,
    write: (row, next) => ({ ...row, amount: next }),
  },
];

export function FeeGrid({ initial }: { initial: FeeRow[] }) {
  const [rows, setRows] = useState(initial);

  return (
    <EditableGrid
      aria-label="费用明细"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      labels={labels}
      onSave={(row) => setRows((current) => current.map((item) => (item.id === row.id ? row : item)))}
      onDelete={(row) => setRows((current) => current.filter((item) => item.id !== row.id))}
      onAdd={() => setRows((current) => [...current, { id: crypto.randomUUID(), name: '', amount: '' }])}
    />
  );
}`,
      render: RowModeDemo,
    },
    {
      title: 'cell 模式：点格即编、失焦即存',
      description:
        '没有编辑 / 保存按钮，Tab 走下一格、Enter 走下一行、Esc 放弃本格；hotkeys 渲染成底栏常驻提示。',
      code: `import { EditableGrid } from '@/components/pro/EditableGrid';

export function FeeSheet({ rows, onSave }: { rows: FeeRow[]; onSave: (row: FeeRow) => void }) {
  return (
    <EditableGrid
      mode="cell"
      aria-label="费用明细"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      labels={{ ...labels, blurSavesHint: '失焦即保存' }}
      hotkeys={['Tab 下一格', 'Enter 下一行', 'Esc 放弃本格']}
      onSave={onSave}
    />
  );
}`,
      render: CellModeDemo,
    },
    {
      title: 'all 模式：整表编辑 + 校验 + 合计条',
      description:
        'validate 返回 { 列 key: 文案 } 即阻止保存，返回 null 视为通过；revealErrors="always" 让错误立刻显形（默认改过或点过保存才红）。',
      code: `import { EditableGrid } from '@/components/pro/EditableGrid';

export function VoucherEntries({ rows, onSave }: { rows: FeeRow[]; onSave: (row: FeeRow) => void }) {
  return (
    <EditableGrid
      mode="all"
      revealErrors="always"
      aria-label="凭证分录"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      labels={labels}
      validate={(row) => (row.name.trim() ? null : { name: '费用名称必填' })}
      footer={
        <div className="flex items-center justify-between px-3 py-2 text-xs text-(--type-2-fg)">
          <span>合计 {rows.length} 行</span>
          <span>校验未通过 {rows.filter((row) => !row.name.trim()).length} 行</span>
        </div>
      }
      onSave={onSave}
    />
  );
}`,
      render: AllModeDemo,
    },
  ],
  notes: [
    '与 antd EditableProTable 的差异：没有 request / dataSource 自管，rows 永远是受控的；组件只自持「编辑中的草稿」，保存时经 onSave 把整行交回，落库与失效缓存都归业务层。',
    '列不是 antd 的 ColumnDef：字段是 key / title / width / align / mono / render / renderEditor / read / write。read 与 write 缺一，这一列就是只读列。',
    'write 必须返回新对象，不能原地改 row——草稿是靠引用比较更新的，原地改会让编辑态不刷新。',
    'width 单位是板上的裸 px 数字（组件内部乘 --app-scale），不给宽度的列占满剩余空间；操作列定宽 96 由组件自持，不要自己再加一列。',
    'validate 是同步函数，返回 { 列 key: 错误文案 }；它同时用于「阻止保存」和「格下方红字」，不要另建一套校验。',
    'onSave 可以返回 Promise，但组件不会等它 resolve 再退出编辑态；需要「保存失败留在编辑态」请用受控的 editingKeys 自己管。',
    'mode="all" 时 editingKeys / onEditingChange 不生效（恒为全部行）；顶部增行条要传 labels.addRowTop 才渲染，只传 addRow 是底部那条。',
  ],
};
