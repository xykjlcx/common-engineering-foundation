import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnPinningState,
  type ColumnSizingState,
  type OnChangeFn,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Pagination, type PaginationPageSize } from './Pagination';
import { RowActionsMenu, RowContextMenu } from './RowActionsMenu';
import type { RowMenuItem } from './row-menu';
import { tableDensityClassName, type TableDensity } from './table-density';

type DataTableAlign = 'start' | 'center' | 'end';

export interface DataTableSelection<T> {
  enabled: boolean;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  /** 批量操作条渲染：传入当前页选中 id，返回操作区 ReactNode；无选中时不渲染 */
  renderBulkBar?: (selectedVisibleIds: string[]) => ReactNode;
  /** 表头全选框可访问名称（必填，保证读屏可用） */
  selectAllAriaLabel: string;
  /** 行选择框可访问名称（必填，按行数据生成，如带成员名） */
  rowSelectAriaLabel: (row: T) => string;
}

export interface DataTablePagination {
  page: number;
  pageCount: number;
  total: number;
  refreshing?: boolean;
  totalLabel: string;
  refreshingLabel?: string;
  prevLabel: string;
  nextLabel: string;
  currentLabel: string;
  onPageChange: (page: number) => void;

  pageSize?: PaginationPageSize;
}

interface DataTableBaseProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: boolean;
  errorText?: string;
  retryText?: string;
  onRetry?: () => void;
  selection?: DataTableSelection<T>;
  pagination?: DataTablePagination;
  onRowClick?: (row: T) => void;
  emptyText: string;
  loadingText: string;
  rowState?: (row: T) => 'selected' | undefined;
  /**
   * 列状态（可见性 / 列序 / 列宽）三合一：给了哪一项哪一项就受控，变更经 `onColumnStateChange`
   * 以「只含变化项的 patch」回吐，业务层直接 `setPrefs(patch)` 落到同一份持久化里；
   * 没给的项由表格自持（如列宽不持久化时）。拆成六个 prop 的老形态 Phase D 要照抄五遍，先在这收口。
   */
  columnState?: Partial<TableColumnState>;
  onColumnStateChange?: (patch: Partial<TableColumnState>) => void;
  /** 行高档（32/34/44），见 table-density.ts */
  density?: TableDensity;

  floatingBarSpace?: boolean;
  sorting?: DataTableSorting | null;
  onSortingChange?: (next: DataTableSorting | null) => void;
  sortAriaLabel?: (header: string, next: 'asc' | 'desc' | 'none') => string;
  enableColumnResizing?: boolean;
  resizeHint?: (label: string, px: number) => string;
  skeletonRows?: number;
  busy?: boolean;
  busyLabel?: string;
  empty?: ReactNode;
  errorBanner?: {
    message: string;
    traceId?: string;
    retryLabel: string;
    copyLabel?: string;
    onRetry: () => void;
  };
}

/** 提供 rowMenu 就必须同时提供 rowMenuLabel（三点钮可访问名）；两者成对出现或同时缺席。 */
type DataTableRowMenuProps<T> =
  | {
      rowMenu?: never;
      rowMenuLabel?: never;
    }
  | {
      /** 行尾三点钮的菜单项；**必须与 `rowMenuLabel` 成对提供**，缺一编译期报错。 */
      rowMenu: (row: T) => RowMenuItem[];
      /** 行尾三点钮的可访问名（静态文案，pro 层不做 i18n，由业务层注入）；**必须与 `rowMenu` 成对提供**。 */
      rowMenuLabel: string;
    };

export type DataTableProps<T> = DataTableBaseProps<T> & DataTableRowMenuProps<T>;

export interface TableColumnState {
  visibility: VisibilityState;
  /** 业务列 id 序（不含内置选择列 / 行尾三点列） */
  order: string[];
  sizing: ColumnSizingState;
}

export interface DataTableSorting {
  field: string;
  dir: 'asc' | 'desc';
}

const emptyRowSelection: RowSelectionState = {};
const emptyColumnVisibility: VisibilityState = {};
const rowSelectionColumnId = '__row_selection__';
const rowMenuColumnId = '__row_menu__';
const checkboxCellContentClassName = 'flex items-center justify-center leading-none';

function alignClass(align: DataTableAlign | undefined) {
  if (align === 'center') return 'text-center';
  if (align === 'end') return 'text-right';
  return 'text-left';
}

/** 列头排序按钮撑满整格时，用 justify 复现 headerAlign 的对齐语义 */
function justifyClass(align: DataTableAlign | undefined) {
  if (align === 'center') return 'justify-center';
  if (align === 'end') return 'justify-end';
  return 'justify-start';
}

function scaledPx(value: number) {
  return `calc(${value}px * var(--app-scale))`;
}

function columnId<T>(column: ColumnDef<T>): string | undefined {
  if (column.id) return column.id;
  if ('accessorKey' in column && typeof column.accessorKey === 'string') return column.accessorKey;
  return undefined;
}

function columnPinning<T>(columns: ColumnDef<T>[]): ColumnPinningState {
  return columns.reduce<ColumnPinningState>(
    (state, column) => {
      const id = columnId(column);
      const pin = column.meta?.pin;
      if (!id || !pin) return state;
      const ids = state[pin];
      if (ids) ids.push(id);
      return state;
    },
    { left: [], right: [] },
  );
}

/**
 * 冻结列的 sticky 偏移不写死数值，读 <table> 上按可见列序号挂的 `--_dt-pin-<i>` 变量：
 * 偏移随列宽变化，若正文格自己算 getStart()，每次拖列宽都得整表重渲染；
 * 改成变量后列宽只改表头 / colgroup 与这组变量，正文 DOM 原地吃新值（TanStack 官方「CSS 变量传列宽」做法）。
 */
function pinnedColumnStyle<T>(column: Column<T>, index: number): CSSProperties | undefined {
  const pinned = column.getIsPinned();
  if (pinned === 'left') return { left: pinnedOffsetVar(index) };
  if (pinned === 'right') return { right: pinnedOffsetVar(index) };
  return undefined;
}

type PinnedOffsetVar = `--_dt-pin-${number}`;

function pinnedOffsetVar(index: number) {
  return `var(--_dt-pin-${index})`;
}

/** <table> 的 style：最小宽度 + 每个冻结列的 sticky 偏移变量（见 pinnedColumnStyle） */
function tableSizingStyle<T>(
  columns: Column<T>[],
  minWidth: number,
  offsetOf: (column: Column<T>, side: 'left' | 'right') => number,
) {
  const style: CSSProperties & Partial<Record<PinnedOffsetVar, string>> = {
    minWidth: `max(100%, ${scaledPx(minWidth)})`,
  };
  columns.forEach((column, index) => {
    const pinned = column.getIsPinned();
    if (pinned === 'left') style[`--_dt-pin-${index}`] = scaledPx(offsetOf(column, 'left'));
    else if (pinned === 'right') style[`--_dt-pin-${index}`] = scaledPx(offsetOf(column, 'right'));
  });
  return style;
}

function useDelayedFlag(flag: boolean, delayMs: number) {
  const [elapsed, setElapsed] = useState(false);
  if (!flag && elapsed) setElapsed(false);
  useEffect(() => {
    if (!flag) return;
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, flag]);
  return flag && elapsed;
}

function sortFieldOf<T>(column: Column<T>) {
  return column.columnDef.meta?.sortField ?? column.id;
}

function cycleSorting(current: DataTableSorting | null, field: string): DataTableSorting | null {
  if (!current || current.field !== field) return { field, dir: 'asc' };
  if (current.dir === 'asc') return { field, dir: 'desc' };
  return null;
}

function headerLabel(header: { column: { columnDef: { header?: unknown } }; id: string }): string {
  const value = header.column.columnDef.header;
  return typeof value === 'string' ? value : header.id;
}

function pinnedColumnClass<T>(column: Column<T>, surface: 'header' | 'body') {
  const pinned = column.getIsPinned();
  if (!pinned) return undefined;

  // 表头格透明且不吃指针，横向滚动时不再把最后一列的列名盖掉；正文格也透明，只有三点钮自己带底
  //（可以稍微盖一点数据行，但不能影响表头）
  const floating = column.id === rowMenuColumnId;

  return cn(
    'sticky z-10',
    floating
      ? surface === 'header'
        ? 'pointer-events-none bg-transparent'
        : 'bg-transparent'
      : surface === 'header'
        ? 'bg-(--table-header-bg)'
        : 'ui-table-pinned-cell',
    pinned === 'left' && column.getStart('left') === 0 && 'left-0',
    pinned === 'right' && column.getAfter('right') === 0 && 'right-0',
  );
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error = false,
  errorText,
  retryText,
  onRetry,
  selection,
  pagination,
  onRowClick,
  emptyText,
  loadingText,
  rowState,
  columnState,
  onColumnStateChange,
  density = 'default',
  floatingBarSpace = false,
  rowMenu,
  rowMenuLabel,
  sorting = null,
  onSortingChange,
  sortAriaLabel,
  enableColumnResizing = true,
  resizeHint,
  skeletonRows = 6,
  busy = false,
  busyLabel,
  empty,
  errorBanner,
}: DataTableProps<T>): JSX.Element {
  const selectionEnabled = !!selection?.enabled;
  const rowSelection = selectionEnabled ? selection.rowSelection : emptyRowSelection;
  const onRowSelectionChange = selectionEnabled ? selection.onRowSelectionChange : undefined;

  // selection（含 aria-label 取值函数）经 ref 读取，让 selectionColumn 保持稳定 deps=[]：
  // 否则消费方每次渲染传入的内联 rowSelectAriaLabel 会重建列定义，触发整表 DOM 重挂。
  // header/cell 由 flexRender 每次渲染重新调用，从 ref 读到的始终是最新 selection。
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const selectionColumn = useMemo<ColumnDef<T>>(
    () => ({
      id: rowSelectionColumnId,
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableSorting: false,
      enablePinning: true,
      meta: { headerAlign: 'center', cellAlign: 'center', pin: 'left' },
      header: ({ table }) => {
        const allSelected = table.getIsAllPageRowsSelected();
        const someSelected = table.getIsSomePageRowsSelected();

        return (
          <div className={checkboxCellContentClassName}>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
              aria-label={selectionRef.current?.selectAllAriaLabel}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className={checkboxCellContentClassName}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(checked)}
            aria-label={selectionRef.current?.rowSelectAriaLabel(row.original)}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ),
    }),
    [],
  );

  // rowMenu 与 selection 同款：经 ref 读取，让列定义保持稳定 deps=[]，
  // 否则消费方每次渲染传入的内联 rowMenu 会重建列定义、触发整表 DOM 重挂。
  const rowMenuEnabled = Boolean(rowMenu && rowMenuLabel);
  const rowMenuRef = useRef({ rowMenu, rowMenuLabel });
  rowMenuRef.current = { rowMenu, rowMenuLabel };

  const rowMenuColumn = useMemo<ColumnDef<T>>(
    () => ({
      id: rowMenuColumnId,

      // 这里落成 pinned-right 列，列宽取板行尾操作位 44px，渐变遮罩仍向左溢出盖住正文。
      size: 44,
      minSize: 44,
      maxSize: 44,
      enableSorting: false,
      enablePinning: true,
      meta: { headerAlign: 'end', cellAlign: 'end', pin: 'right', stopRowClick: true },
      header: () => null,
      cell: ({ row }) => {
        const { rowMenu: items, rowMenuLabel: label } = rowMenuRef.current;
        if (!items || !label) return null;
        return <RowActionsMenu items={items(row.original)} ariaLabel={label} />;
      },
    }),
    [],
  );

  const tableColumns = useMemo(() => {
    const base = selectionEnabled ? [selectionColumn, ...columns] : columns;
    return rowMenuEnabled ? [...base, rowMenuColumn] : base;
  }, [columns, rowMenuColumn, rowMenuEnabled, selectionColumn, selectionEnabled]);
  const pinnedColumns = useMemo(() => columnPinning(tableColumns), [tableColumns]);
  // 列宽：业务层给了 columnState.sizing 就受控（可持久化），否则表格自持
  const [localColumnSizing, setLocalColumnSizing] = useState<ColumnSizingState>({});
  const columnVisibility = columnState?.visibility ?? emptyColumnVisibility;
  const columnOrder = columnState?.order;
  const columnSizing = columnState?.sizing ?? localColumnSizing;
  const onColumnVisibilityChange: OnChangeFn<VisibilityState> | undefined = onColumnStateChange
    ? (updater) => {
        const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
        onColumnStateChange({ visibility: next });
      }
    : undefined;
  const onColumnSizingChange: OnChangeFn<ColumnSizingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(columnSizing) : updater;
    if (columnState?.sizing && onColumnStateChange) onColumnStateChange({ sizing: next });
    else setLocalColumnSizing(next);
  };
  const showBusyPill = useDelayedFlag(busy, 300);

  const composedColumnOrder = useMemo(() => {
    if (!columnOrder) return undefined;
    const middle = columnOrder.filter((id) => id !== rowSelectionColumnId && id !== rowMenuColumnId);
    return [
      ...(selectionEnabled ? [rowSelectionColumnId] : []),
      ...middle,
      ...(rowMenuEnabled ? [rowMenuColumnId] : []),
    ];
  }, [columnOrder, rowMenuEnabled, selectionEnabled]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: rowKey,
    manualPagination: true,
    enableRowSelection: selectionEnabled,
    enableColumnPinning: true,
    enableColumnResizing,
    // onEnd：拖动中 TanStack 不改 columnSizing、不回调业务层（否则受控列宽每次 mousemove 都写
    // 偏好 store + localStorage 并重渲染整个页面，实测生产包每步 ~20ms）。拖动中的实时列宽由
    // columnSizingInfo（起始宽 + 位移）在本组件内算出，只喂给 colgroup / 表头 / 气泡；松手才提交一次。
    columnResizeMode: 'onEnd',
    defaultColumn: { minSize: 60, maxSize: 600 },
    state: {
      rowSelection,
      columnPinning: pinnedColumns,
      columnVisibility,
      columnSizing,
      ...(composedColumnOrder ? { columnOrder: composedColumnOrder } : {}),
    },
    onRowSelectionChange,
    onColumnVisibilityChange,
    onColumnSizingChange,
    onColumnOrderChange: onColumnStateChange
      ? (updater) => {
          const current = composedColumnOrder ?? tableColumns.map((column) => columnId(column) ?? '');
          const next = typeof updater === 'function' ? updater(current) : updater;
          onColumnStateChange({
            order: next.filter((id) => id !== rowSelectionColumnId && id !== rowMenuColumnId),
          });
        }
      : undefined,
  });

  const selectedVisibleIds = table.getSelectedRowModel().rows.map((row) => row.id);
  const bulkBar =
    selectionEnabled && selectedVisibleIds.length > 0 ? selection?.renderBulkBar?.(selectedVisibleIds) : null;
  const visibleColumns = table.getVisibleLeafColumns();
  const columnCount = visibleColumns.length;
  const sizingInfo = table.getState().columnSizingInfo;
  // 拖动中的实时列宽：与 TanStack onChange 模式同一公式（起始宽 + 位移，再夹在 min/max 之间）
  const liveSizing = sizingInfo.isResizingColumn
    ? Object.fromEntries(
        sizingInfo.columnSizingStart.map(([id, startSize]) => {
          const def = table.getColumn(id)?.columnDef;
          const min = def?.minSize ?? 60;
          const max = def?.maxSize ?? 600;
          return [id, Math.min(Math.max(startSize + (sizingInfo.deltaOffset ?? 0), min), max)];
        }),
      )
    : null;
  const sizeOf = (column: Column<T>) => liveSizing?.[column.id] ?? column.getSize();
  // TanStack 8.21 的 touchend 读 e.touches[0]（touchend 时已为空）→ onEnd 模式下触屏松手不提交，
  // 列宽回弹。这里在 touchstart 时自挂一个 touchend，用最后一帧的实时列宽自己提交一次。
  const liveSizingRef = useRef(liveSizing);
  liveSizingRef.current = liveSizing;
  const commitTouchResize = () => {
    const sizes = liveSizingRef.current;
    if (sizes) onColumnSizingChange((old) => ({ ...old, ...sizes }));
  };
  const tableMinWidth = visibleColumns.reduce((total, column) => total + sizeOf(column), 0);
  // 旧行减淡的两种来源（§3.12.3 / §3.12.4）：刷新中，或出错但仍在展示上一批数据
  const showErrorBanner = error && data.length > 0 && !!errorBanner;
  const staleRows = busy || showErrorBanner;
  // 空态只在「不加载、无错误屏、无行」时铺；错误屏（error && 无数据）仍住 tbody
  const showEmpty = !loading && !(error && data.length === 0) && table.getRowModel().rows.length === 0;

  // 列宽拖拽性能（实测拖拽非常卡）：列宽经 <colgroup> + `--_dt-pin-*` 变量生效，
  // 正文 DOM 不需要重渲染；但 TanStack 每次 mousemove / 抓握 / 松手都改 columnSizing(Info) 状态，
  // 整表 100 行 × 13 列跟着重渲染（实测抓握与松手各卡 ~90ms）。这里把正文元素 useMemo 起来，
  // 依赖里刻意不含 columnSizing / columnSizingInfo：拖动全程正文元素引用不变，React 直接跳过该子树。
  // rowSelection / pinnedColumns / columnVisibility / composedColumnOrder 虽未在闭包里直接读，
  // 但 row.getIsSelected() / column.getIsPinned() / getVisibleCells() 在 table 上读的正是它们，须列为依赖。
  const isResizing = !!table.getState().columnSizingInfo.isResizingColumn;
  const rows = table.getRowModel().rows;
  const bodyElement = useMemo(
    () => (
      <TableBody className="[&_tr:last-child]:border-t">
        {showErrorBanner && errorBanner ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="p-0">
              <ErrorBanner banner={errorBanner} />
            </TableCell>
          </TableRow>
        ) : null}
        {error && data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="p-0 text-(--table-header-fg)">
              <div
                role="alert"
                className="sticky left-0 flex h-36 w-[100cqw] flex-col items-center justify-center gap-2"
              >
                <CircleAlert aria-hidden="true" className="size-5 text-danger" />
                <span>{errorBanner?.message ?? errorText}</span>
                {errorBanner?.traceId && (
                  <span className="font-mono text-[calc(11.5px*var(--app-scale))] text-(--text-3)">
                    {errorBanner.traceId}
                  </span>
                )}
                {onRetry && retryText && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    {retryText}
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ) : loading ? (
          <LoadingRows columns={visibleColumns} loadingText={loadingText} rows={skeletonRows} />
        ) : rows.length > 0 ? (
          rows.map((row) => {
            const state = selectionEnabled && row.getIsSelected() ? 'selected' : rowState?.(row.original);

            const menuItems = rowMenuEnabled ? (rowMenu?.(row.original) ?? []) : [];

            const rowNode = (
              <TableRow
                key={row.id}
                data-state={state}
                data-busy={staleRows || undefined}
                aria-selected={state === 'selected' ? true : selectionEnabled ? false : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'group/row border-t border-(--table-row-border) border-b-0 transition-none',
                  onRowClick && 'cursor-pointer',
                  staleRows && 'opacity-[var(--table-busy-opacity)]',
                )}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        onRowClick(row.original);
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell, index) => {
                  const stopRowClick =
                    cell.column.id === rowSelectionColumnId ||
                    cell.column.columnDef.meta?.stopRowClick === true;

                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        alignClass(cell.column.columnDef.meta?.cellAlign),
                        pinnedColumnClass(cell.column, 'body'),
                      )}
                      style={pinnedColumnStyle(cell.column, index)}
                      onClick={stopRowClick ? (event) => event.stopPropagation() : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            );

            if (menuItems.length === 0) return rowNode;

            return (
              <RowContextMenu key={row.id} items={menuItems}>
                {rowNode}
              </RowContextMenu>
            );
          })
        ) : null}
      </TableBody>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- table 为稳定可变实例，选择与列状态必须显式触发表体更新。
    [
      columnCount,
      columnVisibility,
      composedColumnOrder,
      data.length,
      error,
      errorBanner,
      errorText,
      loading,
      loadingText,
      onRetry,
      onRowClick,
      pinnedColumns,
      retryText,
      rowMenu,
      rowMenuEnabled,
      rowMenuLabel,
      selection?.rowSelectAriaLabel,
      rowSelection,
      rowState,
      rows,
      selectionEnabled,
      showErrorBanner,
      skeletonRows,
      staleRows,
      visibleColumns,
    ],
  );
  // 冻结偏移：静态时直接用 TanStack 的 getStart / getAfter；拖动中用实时列宽自己累加
  const pinnedOffsetOf = (column: Column<T>, side: 'left' | 'right') => {
    if (!liveSizing) return side === 'left' ? column.getStart('left') : column.getAfter('right');
    const group = side === 'left' ? table.getLeftVisibleLeafColumns() : table.getRightVisibleLeafColumns();
    const index = group.findIndex((item) => item.id === column.id);
    const siblings = side === 'left' ? group.slice(0, index) : group.slice(index + 1);
    return siblings.reduce((total, item) => total + sizeOf(item), 0);
  };
  const tableStyle = tableSizingStyle(visibleColumns, tableMinWidth, pinnedOffsetOf);

  return (
    <div
      data-slot="data-table"
      data-resizing={isResizing || undefined}
      // 拖动列宽时全表 select-none：否则左右拖会把表头 / 单元格文字一路选中
      className={cn(
        'relative flex min-h-0 min-w-0 flex-1 flex-col',
        isResizing && 'cursor-col-resize select-none',
      )}
    >
      {bulkBar}
      <Table
        containerClassName={cn(
          'flex min-h-0 flex-1 flex-col bg-(--table-bg) [container-type:inline-size]',
          tableDensityClassName[density],
          // 空态没有可选行也就没有批量条，不预留底部空间，否则空态铺不到容器底
          floatingBarSpace && !showEmpty && 'pb-[var(--action-bar-space)]',
        )}
        className="flex-none"
        // 空态铺在 <table> 之外、滚动容器之内：flex-1 撑满表头以下全部剩余高度并居中
        // （固定高度的表格里空态不能只占顶上一小截）
        afterTable={
          showEmpty ? (
            <div
              data-slot="data-table-empty"
              className="flex min-h-[calc(144px*var(--app-scale))] flex-1 items-center justify-center text-center text-(--table-header-fg)"
            >
              {empty ?? emptyText}
            </div>
          ) : undefined
        }
        data-density={density}
        aria-busy={loading || busy || !!pagination?.refreshing}
        style={tableStyle}
      >
        <colgroup>
          {visibleColumns.map((column) => (
            <col key={column.id} style={{ width: scaledPx(sizeOf(column)) }} />
          ))}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const field = sortFieldOf(header.column);
                const canSort = header.column.columnDef.enableSorting === true && !!onSortingChange;
                const active = sorting?.field === field;
                const nextDir: 'asc' | 'desc' | 'none' = !active
                  ? 'asc'
                  : sorting?.dir === 'asc'
                    ? 'desc'
                    : 'none';
                const isBuiltIn =
                  header.column.id === rowSelectionColumnId || header.column.id === rowMenuColumnId;
                const resizing = header.column.getIsResizing();

                return (
                  <TableHead
                    key={header.id}
                    aria-label={
                      typeof header.column.columnDef.header === 'string'
                        ? header.column.columnDef.header
                        : undefined
                    }
                    aria-sort={
                      canSort
                        ? active
                          ? sorting?.dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                    className={cn(
                      'relative',
                      alignClass(header.column.columnDef.meta?.headerAlign),
                      pinnedColumnClass(header.column, 'header'),
                      canSort && 'cursor-pointer',
                      active && 'font-semibold text-(--text)',
                    )}
                    style={pinnedColumnStyle(header.column, index)}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      // 列头整格可点（review C3）：按钮撑满 th 内容区，右缘 6px resizer 命中区绝对定位在其上层
                      <button
                        type="button"
                        className={cn(
                          'flex h-full w-full cursor-pointer items-center gap-[calc(4px*var(--app-scale))]',
                          justifyClass(header.column.columnDef.meta?.headerAlign),
                        )}
                        aria-label={sortAriaLabel?.(headerLabel(header), nextDir)}
                        onClick={() => onSortingChange?.(cycleSorting(sorting, field))}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {active &&
                          (sorting?.dir === 'asc' ? (
                            <ArrowUp className="size-[calc(12px*var(--app-scale))] text-(--table-action-fg)" />
                          ) : (
                            <ArrowDown className="size-[calc(12px*var(--app-scale))] text-(--table-action-fg)" />
                          ))}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                    {enableColumnResizing && !isBuiltIn && header.column.getCanResize() && (
                      <TableColumnResizer
                        resizing={resizing}
                        ariaLabel={headerLabel(header)}
                        value={Math.round(sizeOf(header.column))}
                        min={header.column.columnDef.minSize ?? 60}
                        max={header.column.columnDef.maxSize ?? 600}
                        onKeyDown={(event) => {
                          const min = header.column.columnDef.minSize ?? 60;
                          const max = header.column.columnDef.maxSize ?? 600;
                          let next: number;
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.stopPropagation();
                            header.column.resetSize();
                            return;
                          }
                          if (event.key === 'ArrowLeft') next = header.column.getSize() - 10;
                          else if (event.key === 'ArrowRight') next = header.column.getSize() + 10;
                          else if (event.key === 'Home') next = min;
                          else if (event.key === 'End') next = max;
                          else return;
                          event.preventDefault();
                          event.stopPropagation();
                          onColumnSizingChange((old) => ({
                            ...old,
                            [header.column.id]: Math.min(max, Math.max(min, next)),
                          }));
                        }}
                        hint={
                          resizeHint?.(headerLabel(header), Math.round(sizeOf(header.column))) ??
                          `${headerLabel(header)} ${Math.round(sizeOf(header.column))}px`
                        }
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={(event) => {
                          header.getResizeHandler()(event);
                          document.addEventListener('touchend', commitTouchResize, { once: true });
                        }}
                        // 双击把手恢复该列默认宽（Excel / ag-Grid 惯例），经同一条 sizing 回调落盘
                        onDoubleClick={() => header.column.resetSize()}
                      />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        {bodyElement}
      </Table>
      {/* 出错时通条已在表头下说明原因，不再叠加「正在筛选」胶囊 */}
      {showBusyPill && !error && <TableBusyPill label={busyLabel} />}
      {pagination && (
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          totalLabel={pagination.totalLabel}
          refreshingLabel={pagination.refreshing ? pagination.refreshingLabel : undefined}
          prevLabel={pagination.prevLabel}
          nextLabel={pagination.nextLabel}
          currentLabel={pagination.currentLabel}
          onPageChange={pagination.onPageChange}
          pageSize={pagination.pageSize}
        />
      )}
    </div>
  );
}

/**
 * 列宽拖拽把手（§3.8）：6px 命中区（hover 才亮把手）+ 3×18 圆角把手 + 拖动中的光晕与跟手气泡。
 * 单独导出是为了让组件站 /dev/components/data-table 能截到「拖拽中」这一态——它在真实表格里只在按住鼠标时出现。
 */
export function TableColumnResizer({
  resizing,
  hint,
  onMouseDown,
  onTouchStart,
  onDoubleClick,
  ariaLabel,
  value,
  min,
  max,
  onKeyDown,
}: {
  ariaLabel?: string;
  value?: number;
  min?: number;
  max?: number;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  resizing: boolean;
  hint: ReactNode;
  onMouseDown?: (event: MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (event: TouchEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
}): JSX.Element {
  return (
    <div
      data-slot="table-resizer"
      role={onKeyDown ? 'separator' : undefined}
      tabIndex={onKeyDown ? 0 : undefined}
      aria-label={ariaLabel}
      aria-orientation={onKeyDown ? 'vertical' : undefined}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      onKeyDown={onKeyDown}
      data-resizing={resizing || undefined}
      className="group/resizer absolute top-0 right-0 z-10 flex h-full w-[calc(6px*var(--app-scale))] cursor-col-resize items-center justify-center"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onDoubleClick={onDoubleClick}
      onClick={(event) => event.stopPropagation()}
    >
      {/* 静默态常显 1px 浅灰细线（Ant Design 同款可拖暗示）：hover / 拖动时让位给主色把手 */}
      <span
        aria-hidden="true"
        data-slot="table-resize-line"
        className={cn(
          'absolute h-[calc(16px*var(--app-scale))] w-px bg-(--table-resize-line) transition-opacity group-hover/resizer:opacity-0 group-focus-visible/resizer:opacity-0',
          resizing && 'opacity-0',
        )}
      />
      <span
        data-slot="table-resize-handle"
        className={cn(
          // hover 高亮挂在 6px 命中区上（review C6）：3px 把手本身太窄，指针几乎命不中
          'relative h-[calc(18px*var(--app-scale))] w-[calc(3px*var(--app-scale))] rounded-full bg-(--table-resize-handle) opacity-0 transition-opacity group-hover/resizer:opacity-100 group-focus-visible/resizer:opacity-100',
          resizing && 'opacity-100',
        )}
        // 光晕是拖动瞬时反馈（§3.8），值来自 --table-resize-glow token，不落任意值 shadow-[…] class
        style={resizing ? { boxShadow: '0 0 0 3px var(--table-resize-glow)' } : undefined}
      />
      {resizing && (
        <span
          data-slot="table-resize-hint"
          className="absolute top-full mt-[calc(8px*var(--app-scale))] whitespace-nowrap rounded-md bg-(--tooltip-bg) px-[calc(8px*var(--app-scale))] py-[calc(4px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--tooltip-fg)"
        >
          {hint}
        </span>
      )}
    </div>
  );
}

function TableBusyPill({ label }: { label?: string }) {
  return (
    <div
      data-slot="table-busy-pill"
      className="pointer-events-none absolute inset-x-0 top-[33%] z-30 mx-auto flex h-[calc(32px*var(--app-scale))] w-fit items-center gap-[calc(8px*var(--app-scale))] rounded-full border border-(--border) bg-(--overlay-bg) px-[calc(12px*var(--app-scale))] text-[calc(13px*var(--app-scale))] shadow-(--overlay-shadow-popover)"
    >
      <span className="flex gap-[calc(4px*var(--app-scale))]" aria-hidden="true">
        <span className="size-[calc(6px*var(--app-scale))] rounded-full bg-(--table-action-fg) motion-safe:animate-pulse" />
        <span className="size-[calc(6px*var(--app-scale))] rounded-full bg-(--table-action-fg) motion-safe:animate-pulse [animation-delay:200ms]" />
        <span className="size-[calc(6px*var(--app-scale))] rounded-full bg-(--table-action-fg) motion-safe:animate-pulse [animation-delay:400ms]" />
      </span>
      {label}
    </div>
  );
}

function ErrorBanner({ banner }: { banner: NonNullable<DataTableProps<unknown>['errorBanner']> }) {
  return (
    <div
      role="alert"
      data-slot="table-error-banner"
      className="sticky left-0 flex h-[calc(40px*var(--app-scale))] w-[100cqw] items-center gap-[calc(8px*var(--app-scale))] border-b border-(--table-banner-error-border) bg-(--table-banner-error-bg) px-[calc(12px*var(--app-scale))] text-[calc(13px*var(--app-scale))] text-(--table-banner-error-fg)"
    >
      <CircleAlert className="size-[calc(14px*var(--app-scale))]" />
      <span className="min-w-0 flex-1 truncate">{banner.message}</span>
      {banner.traceId && (
        <span className="font-mono text-[calc(11.5px*var(--app-scale))] text-(--text-3)">
          {banner.traceId}
        </span>
      )}
      <Button type="button" size="sm" variant="outline" onClick={banner.onRetry}>
        {banner.retryLabel}
      </Button>
      {banner.copyLabel && banner.traceId && (
        <button
          type="button"
          className="cursor-pointer text-[calc(12.5px*var(--app-scale))]"
          onClick={() => void navigator.clipboard.writeText(banner.traceId ?? '')}
        >
          {banner.copyLabel}
        </button>
      )}
    </div>
  );
}

function LoadingRows<T>({
  columns,
  loadingText,
  rows,
}: {
  columns: Column<T>[];
  loadingText: string;
  rows: number;
}) {
  return (
    <>
      {Array.from({ length: Math.min(Math.max(rows, 1), 15) }).map((_, rowIndex) => (
        <TableRow key={rowIndex} data-testid="data-table-loading-row">
          {columns.map((column, cellIndex) => {
            const isSelectionColumn = column.id === rowSelectionColumnId;
            const isLastColumn = cellIndex === columns.length - 1;

            return (
              <TableCell
                key={column.id}
                className={cn(
                  alignClass(column.columnDef.meta?.cellAlign),
                  pinnedColumnClass(column, 'body'),
                )}
                style={pinnedColumnStyle(column, cellIndex)}
              >
                {rowIndex === 0 && cellIndex === 0 && (
                  <span role="status" aria-label={loadingText} className="sr-only">
                    {loadingText}
                  </span>
                )}
                {/* 骨架条几何取 StateEmpty.dc.html 加载格：条高 10px、圆角 2px；
                    列宽沿用真实列定义，加载完不跳版 */}
                <Skeleton
                  className={cn(
                    'h-[calc(10px*var(--app-scale))] rounded-4',
                    isSelectionColumn && 'mx-auto w-4',
                    !isSelectionColumn && isLastColumn && 'w-16',
                    !isSelectionColumn && column.columnDef.meta?.cellAlign === 'end' && 'ml-auto',
                    !isSelectionColumn && !isLastColumn && 'w-3/4',
                  )}
                />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}
