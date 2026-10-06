import { useState } from 'react';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableSorting } from '@/components/pro/DataTable';
import type { UsageDoc } from '../types';

/* 数据表格「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

interface DemoRow {
  id: string;
  name: string;
  dept: string;
}

const demoRows: DemoRow[] = [
  { id: 'r1', name: '李长昕', dept: '技术中心' },
  { id: 'r2', name: '王思远', dept: '运营中心' },
  { id: 'r3', name: '陈嘉怡', dept: '财务部' },
];

const demoColumns: ColumnDef<DemoRow>[] = [
  { id: 'name', header: '姓名', size: 160, cell: ({ row }) => row.original.name },
  { id: 'dept', header: '部门', size: 200, cell: ({ row }) => row.original.dept },
];

function BasicDemo() {
  return (
    <DataTable
      columns={demoColumns}
      data={demoRows}
      rowKey={(row) => row.id}
      emptyText="暂无数据"
      loadingText="正在加载"
    />
  );
}

function SelectionDemo() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  return (
    <DataTable
      columns={demoColumns}
      data={demoRows}
      rowKey={(row) => row.id}
      emptyText="暂无数据"
      loadingText="正在加载"
      selection={{
        enabled: true,
        rowSelection,
        onRowSelectionChange: setRowSelection,
        selectAllAriaLabel: '选择本页全部',
        rowSelectAriaLabel: (row) => `选择 ${row.name}`,
        renderBulkBar: (ids) => (
          <div className="flex items-center gap-2">
            <span className="text-xs text-(--type-2-fg)">已选 {ids.length} 项</span>
            <Button size="xs" variant="secondary" onClick={() => setRowSelection({})}>
              取消选择
            </Button>
          </div>
        ),
      }}
    />
  );
}

const sortableColumns: ColumnDef<DemoRow>[] = [
  { id: 'name', header: '姓名', size: 160, enableSorting: true, cell: ({ row }) => row.original.name },
  { id: 'dept', header: '部门', size: 200, enableSorting: true, cell: ({ row }) => row.original.dept },
];

function SortingPaginationDemo() {
  const [sorting, setSorting] = useState<DataTableSorting | null>({ field: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);

  return (
    <DataTable
      columns={sortableColumns}
      data={demoRows}
      rowKey={(row) => row.id}
      emptyText="暂无数据"
      loadingText="正在加载"
      sorting={sorting}
      onSortingChange={setSorting}
      sortAriaLabel={(header, next) =>
        `${header}：切换到${next === 'none' ? '不排序' : next === 'asc' ? '升序' : '降序'}`
      }
      pagination={{
        page,
        pageCount: 3,
        total: 9,
        totalLabel: '共 9 条',
        prevLabel: '上一页',
        nextLabel: '下一页',
        currentLabel: `第 ${page} 页`,
        onPageChange: setPage,
      }}
    />
  );
}

export const usage: UsageDoc = {
  when:
    '后台的列表页一律用 DataTable：它把 TanStack Table 的列模型、行选择、服务端排序、列宽拖拽、密度、四种异常态一次装完，' +
    '业务层只负责给 columns / data / rowKey 和一组文案。' +
    '不要为了「这个表很简单」去手写原生 table 元素或直接用 ui/Table——ui/Table 是 DataTable 内部用的原语，标准业务表格只有 DataTable 一种。' +
    '分页、行选择、排序都不要在业务层另建状态机：分页条状态由 pagination 这一个对象描述，选择只走 selection 的受控 API。',
  examples: [
    {
      title: '最小可用表格',
      description: 'columns / data / rowKey / emptyText / loadingText 是仅有的五个必填项，其余全是可选增强。',
      code: `import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/pro/DataTable';

interface Row {
  id: string;
  name: string;
  dept: string;
}

const rows: Row[] = [
  { id: 'r1', name: '李长昕', dept: '技术中心' },
  { id: 'r2', name: '王思远', dept: '运营中心' },
  { id: 'r3', name: '陈嘉怡', dept: '财务部' },
];

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: '姓名', size: 160, cell: ({ row }) => row.original.name },
  { id: 'dept', header: '部门', size: 200, cell: ({ row }) => row.original.dept },
];

export function BasicTable() {
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(row) => row.id}
      emptyText="暂无数据"
      loadingText="正在加载"
    />
  );
}`,
      render: BasicDemo,
    },
    {
      title: '行选择与批量操作条',
      description:
        '选择列由 DataTable 自己插；业务层只持有 rowSelection 这一份状态，批量条经 renderBulkBar 注入。',
      code: `import { useState } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/pro/DataTable';

export function SelectableTable() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(row) => row.id}
      emptyText="暂无数据"
      loadingText="正在加载"
      selection={{
        enabled: true,
        rowSelection,
        onRowSelectionChange: setRowSelection,
        selectAllAriaLabel: '选择本页全部',
        rowSelectAriaLabel: (row) => \`选择 \${row.name}\`,
        renderBulkBar: (ids) => (
          <div className="flex items-center gap-2">
            <span className="text-xs text-(--type-2-fg)">已选 {ids.length} 项</span>
            <Button size="xs" variant="secondary" onClick={() => setRowSelection({})}>
              取消选择
            </Button>
          </div>
        ),
      }}
    />
  );
}`,
      render: SelectionDemo,
    },
    {
      title: '服务端排序与分页',
      description:
        'sorting 是 { field, dir } 而不是 TanStack 的数组；把它写进 URL search，再喂给列表 query。',
      code: `import { useState } from 'react';
import { DataTable, type DataTableSorting } from '@/components/pro/DataTable';

export function ServerTable() {
  const [sorting, setSorting] = useState<DataTableSorting | null>({ field: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(row) => row.id}
      emptyText="暂无数据"
      loadingText="正在加载"
      sorting={sorting}
      onSortingChange={setSorting}
      sortAriaLabel={(header, next) => \`\${header}：切换到\${next}\`}
      pagination={{
        page,
        pageCount: 3,
        total: 9,
        totalLabel: '共 9 条',
        prevLabel: '上一页',
        nextLabel: '下一页',
        currentLabel: \`第 \${page} 页\`,
        onPageChange: setPage,
      }}
    />
  );
}`,
      render: SortingPaginationDemo,
    },
  ],
  notes: [
    '与 antd 的差异：列定义是 TanStack 的 ColumnDef（id / header / size / cell），不是 antd 的 { title, dataIndex, key }；对齐、冻结、阻止行点击写在 column.meta 的 headerAlign / cellAlign / pin / stopRowClick 上。',
    'rowKey 是函数不是字段名：antd 写 rowKey="id"，这里写 rowKey={(row) => row.id}。',
    'sorting 用 { field, dir: "asc" | "desc" } 单字段形态，只做服务端排序；本组件不会替你在前端重排 data。',
    '分页永远受控：DataTable 不自持页码，page / pageCount / total 与 onPageChange 必须由业务层给（一般存在 URL search 里）。',
    'loading（骨架屏）与 busy（半透明遮罩，翻页时保留旧数据）是两件事；错误分两档，error 是整表替换，errorBanner 是顶部横幅且保留表体。',
    '列宽 / 列序 / 列可见性三件合成一个 columnState 传入，变更经 onColumnStateChange 回吐「只含变化项」的 patch，直接落到同一份持久化里。',
    'queryKey 只能来自业务包的 api/keys.ts factory；表格里拿到的数据永远由父层 useQuery 提供，不要在列定义里发请求。',
  ],
};
