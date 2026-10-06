import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Column,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Excel 式可编辑表格示例（先用 TanStack 自己做一版看看」）。
// TanStack 只管列模型 / 表头 / 行模型；下面这些全是自己加的一层，约 200 行：
//   · 单元格焦点 + 矩形选区（锚点 / 焦点两个坐标；鼠标按下拖动、Shift+方向键扩选）
//   · 方向键 / Tab / Enter 导航，Enter 或直接敲字进入编辑，Esc 取消，Delete 清空选区
//   · ⌘/Ctrl+C 把选区拼成 TSV 写剪贴板；⌘/Ctrl+V 解析 TSV（Excel 复制即此格式）从焦点格往右下铺，行不够自动加
// 未做：填充柄、撤销、合并单元格、虚拟滚动——那些是电子表格引擎的活，见对话里 Glide Data Grid 的评估。
// 只住矩阵页做形态验证，不进业务页、不改 pro/DataTable。

interface SheetRow {
  ref: string;
  subNo: string;
  actualWeight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  note: string;
}

type SheetKey = keyof SheetRow;
interface CellPos {
  row: number;
  col: number;
}

const numericKeys = new Set<SheetKey>(['actualWeight', 'length', 'width', 'height']);

const initialRows: SheetRow[] = [
  {
    ref: 'TEST003-DE',
    subNo: '8040026097067-1',
    actualWeight: 12.4,
    length: 60,
    width: 40,
    height: 35,
    note: '',
  },
  {
    ref: 'TEST003-DE',
    subNo: '8040026097067-2',
    actualWeight: 8.1,
    length: 45,
    width: 35,
    height: 30,
    note: '易碎',
  },
  {
    ref: 'TEST004-FR',
    subNo: '8040026097068-1',
    actualWeight: 21,
    length: 80,
    width: 50,
    height: 40,
    note: '',
  },
  {
    ref: 'TEST004-FR',
    subNo: '8040026097068-2',
    actualWeight: null,
    length: null,
    width: null,
    height: null,
    note: '待称重',
  },
];

const emptyRow = (): SheetRow => ({
  ref: '',
  subNo: '',
  actualWeight: null,
  length: null,
  width: null,
  height: null,
  note: '',
});

const helper = createColumnHelper<SheetRow>();
const columns = [
  helper.accessor('ref', { header: '参考编号', size: 130 }),
  helper.accessor('subNo', { header: '转单子单', size: 170 }),
  helper.accessor('actualWeight', {
    header: '实重 (kg)',
    size: 100,
    meta: { cellAlign: 'end', headerAlign: 'end' },
  }),
  helper.accessor('length', { header: '长 (cm)', size: 90, meta: { cellAlign: 'end', headerAlign: 'end' } }),
  helper.accessor('width', { header: '宽 (cm)', size: 90, meta: { cellAlign: 'end', headerAlign: 'end' } }),
  helper.accessor('height', { header: '高 (cm)', size: 90, meta: { cellAlign: 'end', headerAlign: 'end' } }),
  helper.accessor('note', { header: '备注', size: 160 }),
];

const alignClass: Record<string, string> = { end: 'text-right font-mono tabular-nums' };

function toText(value: string | number | null): string {
  return value === null ? '' : String(value);
}

function parseCell(key: SheetKey, raw: string): string | number | null {
  const text = raw.trim();
  if (!numericKeys.has(key)) return text;
  if (text === '') return null;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function normalize(a: CellPos, b: CellPos) {
  return {
    r0: Math.min(a.row, b.row),
    r1: Math.max(a.row, b.row),
    c0: Math.min(a.col, b.col),
    c1: Math.max(a.col, b.col),
  };
}

function widthStyle(column: Column<SheetRow>): CSSProperties {
  return { width: column.getSize() };
}

export default function SheetTableMatrix(): JSX.Element {
  const [rows, setRows] = useState<SheetRow[]>(initialRows);
  const [anchor, setAnchor] = useState<CellPos>({ row: 0, col: 0 });
  const [focus, setFocus] = useState<CellPos>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<{ pos: CellPos; draft: string } | null>(null);
  const [lastAction, setLastAction] = useState('');
  const dragging = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
  const leafColumns = table.getVisibleLeafColumns();
  const keys = useMemo(() => leafColumns.map((c) => c.id as SheetKey), [leafColumns]);
  const range = normalize(anchor, focus);
  const inRange = (r: number, c: number) => r >= range.r0 && r <= range.r1 && c >= range.c0 && c <= range.c1;

  const clamp = (pos: CellPos): CellPos => ({
    row: Math.max(0, Math.min(rows.length - 1, pos.row)),
    col: Math.max(0, Math.min(keys.length - 1, pos.col)),
  });

  const select = (pos: CellPos, extend: boolean) => {
    const next = clamp(pos);
    setFocus(next);
    if (!extend) setAnchor(next);
  };

  const writeCells = useCallback(
    (start: CellPos, matrix: string[][]) => {
      setRows((prev) => {
        const needRows = start.row + matrix.length;
        const next = prev.map((r) => ({ ...r }));
        while (next.length < needRows) next.push(emptyRow());
        matrix.forEach((line, dr) => {
          line.forEach((text, dc) => {
            const key = keys[start.col + dc];
            const target = next[start.row + dr];
            if (!key || !target) return;
            (target as Record<SheetKey, string | number | null>)[key] = parseCell(key, text);
          });
        });
        return next;
      });
    },
    [keys],
  );

  const startEdit = (pos: CellPos, seed?: string) => {
    const key = keys[pos.col];
    const row = rows[pos.row];
    if (!key || !row) return;
    setEditing({ pos, draft: seed ?? toText(row[key]) });
  };

  const commitEdit = () => {
    if (!editing) return;
    writeCells(editing.pos, [[editing.draft]]);
    setEditing(null);
    gridRef.current?.focus();
  };

  const selectionTsv = () =>
    Array.from({ length: range.r1 - range.r0 + 1 }, (_, dr) =>
      Array.from({ length: range.c1 - range.c0 + 1 }, (_, dc) => {
        const key = keys[range.c0 + dc];
        const row = rows[range.r0 + dr];
        return key && row ? toText(row[key]) : '';
      }).join('\t'),
    ).join('\n');

  const onCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    if (editing) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', selectionTsv());
    setLastAction(`已复制 ${range.r1 - range.r0 + 1}×${range.c1 - range.c0 + 1} 单元格`);
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (editing) return;
    const text = event.clipboardData.getData('text/plain');
    if (!text) return;
    event.preventDefault();
    const matrix = text
      .replace(/\r/g, '')
      .replace(/\n$/, '')
      .split('\n')
      .map((line) => line.split('\t'));
    const start = { row: range.r0, col: range.c0 };
    writeCells(start, matrix);
    setAnchor(start);
    setFocus({
      row: start.row + matrix.length - 1,
      col: Math.min(keys.length - 1, start.col + (matrix[0]?.length ?? 1) - 1),
    });
    setLastAction(`已粘贴 ${matrix.length} 行 × ${matrix[0]?.length ?? 0} 列`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    const meta = event.metaKey || event.ctrlKey;
    const moves: Record<string, CellPos> = {
      ArrowUp: { row: -1, col: 0 },
      ArrowDown: { row: 1, col: 0 },
      ArrowLeft: { row: 0, col: -1 },
      ArrowRight: { row: 0, col: 1 },
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      select({ row: focus.row + move.row, col: focus.col + move.col }, event.shiftKey);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      select({ row: focus.row, col: focus.col + (event.shiftKey ? -1 : 1) }, false);
      return;
    }
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      startEdit(focus);
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      const blank = Array.from({ length: range.r1 - range.r0 + 1 }, () =>
        Array.from({ length: range.c1 - range.c0 + 1 }, () => ''),
      );
      writeCells({ row: range.r0, col: range.c0 }, blank);
      setLastAction('已清空选区');
      return;
    }
    if (meta && (event.key === 'a' || event.key === 'A')) {
      event.preventDefault();
      setAnchor({ row: 0, col: 0 });
      setFocus({ row: rows.length - 1, col: keys.length - 1 });
      return;
    }
    // 直接敲字 = 以该字符开始编辑（Excel 行为）；⌘/Ctrl 组合键交给 copy/paste 事件
    if (!meta && event.key.length === 1) {
      event.preventDefault();
      startEdit(focus, event.key);
    }
  };

  const onCellMouseDown = (event: MouseEvent, pos: CellPos) => {
    if (editing) commitEdit();
    dragging.current = true;
    select(pos, event.shiftKey);
    gridRef.current?.focus();
  };

  return (
    <section
      data-testid="sheetTableMatrix"
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">Excel 式表格（框选 / 复制 / 粘贴 / 就地编辑）</h2>
        <p className="text-sm text-(--type-2-fg)">
          TanStack Table 只出列模型与表头，选区、剪贴板、编辑全是自建的一层（约 200 行）。 试试：拖选一块 →
          ⌘C；从 Excel 复制几格 → 点一格 → ⌘V；方向键 / Shift 扩选 / Enter 编辑 / Delete 清空。
        </p>
      </div>
      <div
        ref={gridRef}
        role="grid"
        aria-label="单件信息（可编辑）"
        tabIndex={0}
        data-slot="sheet-grid"
        className="select-none rounded-md border border-(--table-border) outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--tabs-ring)"
        onKeyDown={onKeyDown}
        onCopy={onCopy}
        onPaste={onPaste}
        onMouseUp={() => {
          dragging.current = false;
        }}
        onMouseLeave={() => {
          dragging.current = false;
        }}
      >
        <Table containerClassName="rounded-md" className="border-separate border-spacing-0">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="border-b-0">
                <TableHead className="w-[calc(44px*var(--app-scale))] border-b border-r border-(--table-border) text-center">
                  #
                </TableHead>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={widthStyle(header.column)}
                    className={cn(
                      'border-b border-r border-(--table-border) last:border-r-0',
                      alignClass[header.column.columnDef.meta?.headerAlign ?? ''],
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row, rowIndex) => (
              <TableRow key={row.id} className="border-b-0">
                <TableCell className="border-b border-r border-(--table-border) bg-(--table-header-bg) text-center text-(--table-header-fg)">
                  {rowIndex + 1}
                </TableCell>
                {row.getVisibleCells().map((cell, colIndex) => {
                  const pos = { row: rowIndex, col: colIndex };
                  const isFocus = focus.row === rowIndex && focus.col === colIndex;
                  const isEditing = editing?.pos.row === rowIndex && editing.pos.col === colIndex;
                  const align = alignClass[cell.column.columnDef.meta?.cellAlign ?? ''];
                  return (
                    <TableCell
                      key={cell.id}
                      role="gridcell"
                      data-selected={inRange(rowIndex, colIndex) || undefined}
                      data-focus={isFocus || undefined}
                      style={widthStyle(cell.column)}
                      className={cn(
                        'relative cursor-cell border-b border-r border-(--table-border) p-0 last:border-r-0',
                        'data-[selected]:bg-(--option-bg-selected)',
                        'data-[focus]:z-10 data-[focus]:outline data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-(--option-fg-selected)',
                        align,
                      )}
                      onMouseDown={(event) => onCellMouseDown(event, pos)}
                      onMouseEnter={() => {
                        if (dragging.current) select(pos, true);
                      }}
                      onDoubleClick={() => startEdit(pos)}
                    >
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editing.draft}
                          aria-label={`编辑 ${String(cell.column.columnDef.header)}`}
                          data-variant="embedded"
                          className={cn(
                            'h-full w-full rounded-none border-0 bg-transparent shadow-none',
                            align,
                          )}
                          onChange={(event) => setEditing({ pos, draft: event.target.value })}
                          onBlur={commitEdit}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitEdit();
                              select({ row: pos.row + 1, col: pos.col }, false);
                            }
                            if (event.key === 'Tab') {
                              event.preventDefault();
                              commitEdit();
                              select({ row: pos.row, col: pos.col + (event.shiftKey ? -1 : 1) }, false);
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              setEditing(null);
                              gridRef.current?.focus();
                            }
                          }}
                        />
                      ) : (
                        <span className="block truncate px-(--table-cell-px)">
                          {toText(rows[rowIndex]?.[keys[colIndex] as SheetKey] ?? null)}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p data-slot="sheet-status" className="mt-2 text-xs text-text-3">
        选区 R{range.r0 + 1}C{range.c0 + 1}:R{range.r1 + 1}C{range.c1 + 1} · 共 {rows.length} 行
        {lastAction ? ` · ${lastAction}` : ''}
      </p>
    </section>
  );
}
