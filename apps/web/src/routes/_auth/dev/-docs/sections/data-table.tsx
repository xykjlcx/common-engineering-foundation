import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { DataTable, TableColumnResizer, type DataTableSorting } from '@/components/pro/DataTable';
import { DataTableRowActions, type DataTableRowAction } from '@/components/pro/DataTableRowActions';

// 数据表格族状态矩阵：选择三态 / 加载 / 空 / 错误 / 旧行刷新 / 错误通条 / 键盘排序 / 列宽拖拽。
// 排序表格的列宽把手可 Tab 聚焦：左右键调宽，Home/End 到边界，Enter 恢复默认。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

interface DataTableThemeRow {
  id: string;
  nameKey: string;
  statusKey: string;
}

const dataTableRows: DataTableThemeRow[] = [
  {
    id: 'selected',
    nameKey: 'dev.themeStates.dataTableSelected',
    statusKey: 'dev.themeStates.tableStatusEnabled',
  },
  {
    id: 'normal',
    nameKey: 'dev.themeStates.dataTableNormal',
    statusKey: 'dev.themeStates.tableStatusEnabled',
  },
  {
    id: 'disabled',
    nameKey: 'dev.themeStates.dataTableDisabled',
    statusKey: 'dev.themeStates.fieldInactive',
  },
];
const dataTableSingleRows: DataTableThemeRow[] = [
  {
    id: 'single',
    nameKey: 'dev.themeStates.dataTableSelected',
    statusKey: 'dev.themeStates.tableStatusEnabled',
  },
];
const dataTablePartialRowSelection: RowSelectionState = { selected: true };
const dataTableAllRowSelection: RowSelectionState = { selected: true, normal: true, disabled: true };
const dataTableSingleRowSelection: RowSelectionState = { single: true };
const dataTableSelectionStates = [
  {
    id: 'partial',
    rows: dataTableRows,
    rowSelection: dataTablePartialRowSelection,
  },
  {
    id: 'all',
    rows: dataTableRows,
    rowSelection: dataTableAllRowSelection,
  },
  {
    id: 'single',
    rows: dataTableSingleRows,
    rowSelection: dataTableSingleRowSelection,
  },
] satisfies {
  id: 'partial' | 'all' | 'single';
  rows: DataTableThemeRow[];
  rowSelection: RowSelectionState;
}[];
const noopDataTableRowSelectionChange: OnChangeFn<RowSelectionState> = () => undefined;

export default function DataTableMatrix(): JSX.Element {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<DataTableSorting | null>({ field: 'name', dir: 'asc' });

  const dataTableRowActions = useMemo<DataTableRowAction[]>(
    () => [
      {
        id: 'view',
        label: t('dev.themeStates.tableActionView'),
        onSelect: () => undefined,
      },
      {
        id: 'edit',
        label: t('dev.themeStates.tableActionEdit'),
        onSelect: () => undefined,
      },
      {
        id: 'delete',
        label: t('dev.themeStates.tableActionDelete'),
        onSelect: () => undefined,
        tone: 'danger',
      },
    ],
    [t],
  );
  const dataTableColumns = useMemo<ColumnDef<DataTableThemeRow>[]>(
    () => [
      {
        id: 'name',
        header: t('dev.themeStates.tableName'),
        size: 220,
        minSize: 180,
        enableSorting: false,
        cell: ({ row }) => t(row.original.nameKey),
      },
      {
        id: 'status',
        header: t('dev.themeStates.tableStatus'),
        size: 160,
        minSize: 140,
        enableSorting: false,
        cell: ({ row }) => t(row.original.statusKey),
      },
      {
        id: 'action',
        header: t('dev.themeStates.tableAction'),
        size: 112,
        minSize: 112,
        maxSize: 112,
        enablePinning: true,
        meta: { headerAlign: 'start', cellAlign: 'start', pin: 'right', stopRowClick: true },
        enableSorting: false,
        cell: () => (
          <DataTableRowActions
            actions={dataTableRowActions}
            overflowLabel={t('dev.themeStates.tableActionMore')}
          />
        ),
      },
    ],
    [t, dataTableRowActions],
  );
  // 排序生效态用同一批列，只把前两列打开排序（DataTable 不接 getSortedRowModel，排序在服务端）
  const dataTableSortableColumns = useMemo(
    () =>
      dataTableColumns.map((column) =>
        column.id === 'name' || column.id === 'status' ? { ...column, enableSorting: true } : column,
      ),
    [dataTableColumns],
  );

  return (
    <section
      data-testid="dataTableMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.dataTableMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step7MatrixDesc')}</p>
      </div>

      <div className="grid gap-4">
        {dataTableSelectionStates.map((state) => (
          <div key={state.id} data-testid={`datatable-selection-${state.id}`} className="grid gap-2">
            <p className="text-sm font-medium text-text">
              {state.id === 'partial'
                ? t('dev.themeStates.choiceIndeterminate')
                : state.id === 'all'
                  ? t('dev.themeStates.choiceChecked')
                  : t('dev.themeStates.dataTableSelected')}
            </p>
            <DataTable
              columns={dataTableColumns}
              data={state.rows}
              rowKey={(row) => row.id}
              emptyText={t('dev.themeStates.dataTableEmpty')}
              loadingText={t('dev.themeStates.dataTableLoading')}
              selection={{
                enabled: true,
                rowSelection: state.rowSelection,
                onRowSelectionChange: noopDataTableRowSelectionChange,
                selectAllAriaLabel: t('dev.themeStates.dataTableSelectAll'),
                rowSelectAriaLabel: (row) =>
                  t('dev.themeStates.dataTableSelectRow', { name: t(row.nameKey) }),
                renderBulkBar: (ids) => (
                  <div className="mb-3 rounded-8 bg-(--table-row-bg-selected) px-3 py-2 text-sm text-(--type-2-fg)">
                    {ids.length}
                  </div>
                ),
              }}
              pagination={
                state.id === 'partial'
                  ? {
                      page: 2,
                      pageCount: 4,
                      total: 42,
                      refreshing: true,
                      totalLabel: t('dev.themeStates.paginationTotal'),
                      refreshingLabel: t('dev.themeStates.paginationRefreshing'),
                      prevLabel: t('dev.themeStates.paginationPrev'),
                      nextLabel: t('dev.themeStates.paginationNext'),
                      currentLabel: t('dev.themeStates.paginationCurrent'),
                      onPageChange: () => undefined,
                    }
                  : undefined
              }
            />
          </div>
        ))}
        <DataTable
          columns={dataTableColumns}
          data={[]}
          rowKey={(row) => row.id}
          loading
          emptyText={t('dev.themeStates.dataTableEmpty')}
          loadingText={t('dev.themeStates.dataTableLoading')}
        />
        <DataTable
          columns={dataTableColumns}
          data={[]}
          rowKey={(row) => row.id}
          emptyText={t('dev.themeStates.dataTableEmpty')}
          loadingText={t('dev.themeStates.dataTableLoading')}
        />
        <DataTable
          columns={dataTableColumns}
          data={[]}
          rowKey={(row) => row.id}
          error
          errorText={t('dev.themeStates.dataTableError')}
          retryText={t('errors.retry')}
          onRetry={() => undefined}
          emptyText={t('dev.themeStates.dataTableEmpty')}
          loadingText={t('dev.themeStates.dataTableLoading')}
        />
        <div data-testid="dataTableStateMatrix" className="grid gap-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.dataTableStates')}</p>

          <div data-testid="datatable-state-busy" className="grid gap-2">
            <p className="text-xs text-text-3">{t('dev.themeStates.dataTableBusy')}</p>
            <DataTable
              columns={dataTableColumns}
              data={dataTableRows}
              rowKey={(row) => row.id}
              busy
              busyLabel={t('dev.themeStates.dataTableBusyLabel')}
              skeletonRows={3}
              emptyText={t('dev.themeStates.dataTableEmpty')}
              loadingText={t('dev.themeStates.dataTableLoading')}
            />
          </div>

          <div data-testid="datatable-state-errorBanner" className="grid gap-2">
            <p className="text-xs text-text-3">{t('dev.themeStates.dataTableErrorBanner')}</p>
            <DataTable
              columns={dataTableColumns}
              data={dataTableRows}
              rowKey={(row) => row.id}
              error
              errorBanner={{
                message: t('dev.themeStates.dataTableErrorBannerText'),
                traceId: t('dev.themeStates.dataTableErrorTrace'),
                retryLabel: t('errors.retry'),
                copyLabel: t('dev.themeStates.dataTableCopyTrace'),
                onRetry: () => undefined,
              }}
              emptyText={t('dev.themeStates.dataTableEmpty')}
              loadingText={t('dev.themeStates.dataTableLoading')}
            />
          </div>

          <div data-testid="datatable-state-sorting" className="grid gap-2">
            <p className="text-xs text-text-3">{t('dev.themeStates.dataTableSorting')}</p>
            <DataTable
              columns={dataTableSortableColumns}
              data={dataTableRows}
              rowKey={(row) => row.id}
              sorting={sorting}
              onSortingChange={(next) => setSorting(next)}
              sortAriaLabel={(header) => t('dev.themeStates.dataTableSortAria', { header })}
              emptyText={t('dev.themeStates.dataTableEmpty')}
              loadingText={t('dev.themeStates.dataTableLoading')}
            />
          </div>

          <div data-testid="datatable-state-resizing" className="grid gap-2">
            <p className="text-xs text-text-3">{t('dev.themeStates.dataTableResizing')}</p>
            {/* 拖拽中只在按住鼠标时存在，这里直接渲染把手本体把该态钉成可截图状态 */}
            <div className="relative h-[calc(72px*var(--app-scale))] w-[calc(160px*var(--app-scale))] rounded-md border border-border bg-(--table-header-bg)">
              <TableColumnResizer resizing hint={t('dev.themeStates.dataTableResizeHint')} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
