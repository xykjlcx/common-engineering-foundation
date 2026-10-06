import { useMemo, type CSSProperties, type JSX } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Column,
  type Header,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// 复杂表格示例（，参考跨境 V6「单件信息」vxe-table 形态）：
//   多级表头（计重信息 → 实重 / 长 / 宽 / 高）+ 左右冻结列 + 合计行 + 横向滚动 + 全网格线。
// 零新依赖：TanStack Table v8 自带 column group / pinning / footer，表头分层用 header.colSpan，
// 单列跨两行用 rowSpan 折叠占位头。只住矩阵页做形态验证，不进任何业务页、不改 pro/DataTable。

interface ParcelRow {
  seq: number;
  ref: string;
  subNo: string;
  actualWeight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  volume: number | null;
  volumeWeight: number | null;
  girth: number | null;
  chargeWeight: number | null;
  status: string;
}

const rows: ParcelRow[] = [
  {
    seq: 1,
    ref: 'TEST003-DE',
    subNo: '8040026097067-1',
    actualWeight: 12.4,
    length: 60,
    width: 40,
    height: 35,
    volume: 0.084,
    volumeWeight: 16.8,
    girth: 210,
    chargeWeight: 16.8,
    status: '已取消',
  },
  {
    seq: 2,
    ref: 'TEST003-DE',
    subNo: '8040026097067-2',
    actualWeight: 8.1,
    length: 45,
    width: 35,
    height: 30,
    volume: 0.047,
    volumeWeight: 9.45,
    girth: 175,
    chargeWeight: 9.45,
    status: '已取消',
  },
  {
    seq: 3,
    ref: 'TEST004-FR',
    subNo: '8040026097068-1',
    actualWeight: 21.0,
    length: 80,
    width: 50,
    height: 40,
    volume: 0.16,
    volumeWeight: 32,
    girth: 260,
    chargeWeight: 32,
    status: '已入库',
  },
  {
    seq: 4,
    ref: 'TEST004-FR',
    subNo: '8040026097068-2',
    actualWeight: null,
    length: null,
    width: null,
    height: null,
    volume: null,
    volumeWeight: null,
    girth: null,
    chargeWeight: null,
    status: '待称重',
  },
];

const fmt = (value: number | null, digits = 1) => (value === null ? '—' : value.toFixed(digits));
const sum = (values: (number | null)[]) => values.reduce<number>((acc, v) => acc + (v ?? 0), 0);

const helper = createColumnHelper<ParcelRow>();

const columns = [
  helper.accessor('seq', {
    header: '序号',
    size: 64,
    footer: '合计',
    meta: { cellAlign: 'center', headerAlign: 'center' },
  }),
  helper.accessor('ref', { header: '参考编号', size: 120 }),
  helper.accessor('subNo', { header: '转单子单', size: 160 }),
  helper.group({
    id: 'weighing',
    header: '计重信息',
    columns: [
      helper.accessor('actualWeight', {
        header: '实重 (kg)',
        size: 100,
        cell: (c) => fmt(c.row.original.actualWeight),
        footer: (c) => fmt(sum(c.table.getRowModel().rows.map((r) => r.original.actualWeight))),
        meta: { cellAlign: 'end', headerAlign: 'end' },
      }),
      helper.accessor('length', {
        header: '长 (cm)',
        size: 90,
        cell: (c) => fmt(c.row.original.length, 0),
        meta: { cellAlign: 'end', headerAlign: 'end' },
      }),
      helper.accessor('width', {
        header: '宽 (cm)',
        size: 90,
        cell: (c) => fmt(c.row.original.width, 0),
        meta: { cellAlign: 'end', headerAlign: 'end' },
      }),
      helper.accessor('height', {
        header: '高 (cm)',
        size: 90,
        cell: (c) => fmt(c.row.original.height, 0),
        meta: { cellAlign: 'end', headerAlign: 'end' },
      }),
    ],
  }),
  helper.group({
    id: 'billing',
    header: '计费信息',
    columns: [
      helper.accessor('volume', {
        header: '体积 (m³)',
        size: 100,
        cell: (c) => fmt(c.row.original.volume, 3),
        footer: (c) => fmt(sum(c.table.getRowModel().rows.map((r) => r.original.volume)), 3),
        meta: { cellAlign: 'end', headerAlign: 'end' },
      }),
      helper.accessor('volumeWeight', {
        header: '材重 (kg)',
        size: 100,
        cell: (c) => fmt(c.row.original.volumeWeight, 2),
        footer: (c) => fmt(sum(c.table.getRowModel().rows.map((r) => r.original.volumeWeight)), 2),
        meta: { cellAlign: 'end', headerAlign: 'end' },
      }),
      helper.accessor('girth', {
        header: '围长 (cm)',
        size: 100,
        cell: (c) => fmt(c.row.original.girth, 0),
        meta: { cellAlign: 'end', headerAlign: 'end' },
      }),
      helper.accessor('chargeWeight', {
        header: '计费重 (kg)',
        size: 110,
        cell: (c) => fmt(c.row.original.chargeWeight, 2),
        footer: (c) => fmt(sum(c.table.getRowModel().rows.map((r) => r.original.chargeWeight)), 2),
        meta: { cellAlign: 'end', headerAlign: 'end' },
      }),
    ],
  }),
  helper.accessor('status', { header: '状态', size: 90 }),
];

const alignClass: Record<string, string> = {
  center: 'text-center',
  end: 'text-right font-mono tabular-nums',
};

/** 列宽 + 冻结偏移都是运行时算出的几何，同 pro/DataTable 的 pinnedColumnStyle 走 style 对象 */
function cellStyle(column: Column<ParcelRow>, width: number | undefined): CSSProperties {
  const pinned = column.getIsPinned();
  const style: CSSProperties = { width };
  if (pinned === 'left') style.left = column.getStart('left');
  if (pinned === 'right') style.right = column.getAfter('right');
  return style;
}

function pinnedClass(column: Column<ParcelRow>, surface: 'header' | 'body') {
  const pinned = column.getIsPinned();
  if (!pinned) return undefined;
  return cn(
    'sticky z-10',
    surface === 'header' ? 'bg-(--table-header-bg)' : 'ui-table-pinned-cell',
    // 冻结区与滚动区交界：右冻结列补一条左边线（右边线每格本来就有）
    pinned === 'right' && column.getIsFirstColumn('right') && 'border-l',
  );
}

/** TanStack 对无分组的叶子列：首行放占位头、真头在末行。这里反过来——首行就用真头并跨满全部表头行，
 *  末行的那个真头跳过；组内叶子照常留在自己那行。返回 0 = 不渲染。 */
function headerRowSpan(header: Header<ParcelRow, unknown>, depth: number, totalDepth: number) {
  const topLevelLeaf = header.column.depth === 0 && header.column.columns.length === 0;
  if (topLevelLeaf) return depth === 0 ? totalDepth : 0;
  return header.isPlaceholder ? 0 : 1;
}

export default function ComplexTableMatrix(): JSX.Element {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnPinning: true,
    state: { columnPinning: { left: ['seq', 'ref'], right: ['status'] } },
  });
  const headerGroups = table.getHeaderGroups();
  const totalDepth = headerGroups.length;
  const tableStyle = useMemo<CSSProperties>(() => ({ minWidth: table.getTotalSize() }), [table]);

  return (
    <section
      data-testid="complexTableMatrix"
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">复杂表格（多级表头 / 冻结列 / 合计行）</h2>
        <p className="text-sm text-(--type-2-fg)">
          TanStack Table v8 原生 column group + pinning + footer，零新依赖；网格线与冻结阴影走 --table-*
          token。 仅作形态验证，不进业务页。缩小窗口可看横向滚动与左右冻结。
        </p>
      </div>
      <div className="rounded-md border border-(--table-border)">
        <Table
          containerClassName="max-w-full rounded-md"
          className="w-auto min-w-full border-separate border-spacing-0"
          style={tableStyle}
        >
          <TableHeader className="[&_tr]:border-b-0">
            {headerGroups.map((group, depth) => (
              <TableRow key={group.id} className="border-b-0">
                {group.headers.map((header) => {
                  const rowSpan = headerRowSpan(header, depth, totalDepth);
                  if (rowSpan === 0) return null;
                  const isGroup = header.subHeaders.length > 0;
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      rowSpan={rowSpan}
                      style={cellStyle(header.column, isGroup ? undefined : header.getSize())}
                      className={cn(
                        'border-b border-r border-(--table-border) bg-(--table-header-bg) last:border-r-0',
                        isGroup ? 'text-center' : alignClass[header.column.columnDef.meta?.headerAlign ?? ''],
                        pinnedClass(header.column, 'header'),
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={cellStyle(cell.column, cell.column.getSize())}
                    className={cn(
                      'border-b border-r border-(--table-border) last:border-r-0',
                      alignClass[cell.column.columnDef.meta?.cellAlign ?? ''],
                      pinnedClass(cell.column, 'body'),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="border-t-0">
            {table
              .getFooterGroups()
              .slice(0, 1)
              .map((group) => (
                <TableRow key={group.id} className="border-b-0">
                  {group.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      style={cellStyle(header.column, header.getSize())}
                      className={cn(
                        'border-r border-(--table-border) bg-(--table-header-bg) font-medium last:border-r-0',
                        alignClass[header.column.columnDef.meta?.headerAlign ?? ''],
                        pinnedClass(header.column, 'header'),
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.footer, header.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableFooter>
        </Table>
      </div>
    </section>
  );
}
