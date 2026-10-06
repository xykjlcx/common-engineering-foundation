import { useState, type JSX } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingActionBar } from '@/components/pro/FloatingActionBar';
import { ColumnSettings } from '@/components/pro/ColumnSettings';
import { FilterChips } from '@/components/pro/filter-chips/FilterChips';
import { FilterMenu } from '@/components/pro/filter-menu/FilterMenu';
import { FilterValuePanel, type FilterValuePanelLabels } from '@/components/pro/filter-menu/FilterValuePanel';
import { ListChrome, ListToolbar } from '@/components/pro/ListChrome';
import { SearchField } from '@/components/pro/SearchField';
import { StatusTabs } from '@/components/pro/StatusTabs';
import {
  FilterBuilder,
  type FilterBuilderLabels,
  type FilterBuilderRowLabels,
  type FilterFieldDef,
  type FilterOperator,
  type FilterRoot,
} from '@/components/pro/filter-builder';

// 列表 chrome 族状态矩阵（FilterBuilder / StatusTabs / ListChrome / FloatingActionBar）。
// 这是 dev-only 演示夹具：pro 组件本身零文案，示例文案在此就地给出（本文件不进业务构建路径）。
// 悬浮批量条在真实页面是 position:fixed；矩阵里为可截图改成 relative 容器内静态展示（见 barPreviewClassName）。

const noop = () => {};

const filterLabels: FilterBuilderLabels = {
  filter: '筛选',
  add: '添加条件',
  and: '且',
  or: '或',
  remove: '移除',
  field: '字段',
  operator: '运算符',
  value: '值',
  group: '加入括号组',
  ungroup: '从组移出',
  emptyValue: '未填',
  rangeFrom: '起始',
  rangeTo: '结束',
  toggleConnector: '切换且或',
};

const rowLabels: FilterBuilderRowLabels = {
  groupTitle: '括号组',
  groupAny: '满足其一',
  groupAll: '满足全部',
  addGroup: '加入括号组',
  addInGroup: '组内添加',
  pickValue: '选择值',
  includeSub: '含下级',
};

const operatorLabels: Partial<Record<FilterOperator, string>> = {
  eq: '是',
  ne: '不是',
  contains: '包含',
  in: '属于',
  notIn: '不属于',
  gte: '≥',
  lte: '≤',
  between: '介于',
  isEmpty: '为空',
  isNotEmpty: '不为空',
};

const filterFields: FilterFieldDef[] = [
  { key: 'voucherDate', label: '凭证日期', input: 'dateRange', operators: ['between', 'gte', 'lte'] },
  {
    key: 'account',
    label: '会计科目',
    input: 'tree',
    operators: ['in', 'eq'],
    options: [
      { value: '2202', label: '2202 应付账款', parentValue: null },
      { value: '220201', label: '应付账款 - 货代', parentValue: '2202' },
      { value: '5401', label: '5401 主营业务成本', parentValue: null },
    ],
    // tree 型值控件是 PickerPopover（板 PickerPopover.dc.html 完整树默认态），文案由业务注入。
    // 筛选场景不接「+ 新建」槽位（在筛选条件里新建科目没有语义），故不传 create。
    pickerLabels: {
      searchPlaceholder: '搜索科目编码或名称',
      frequent: '常用',
      empty: '无匹配科目',
      matchHint: (query: string, count: number) => `搜索「${query}」· ${count} 个匹配科目`,
      hints: ['↑↓ 选择', 'Enter 确认', 'Esc 关闭'],
      more: (count: number) => `+${count}`,
    },
  },
  { key: 'amount', label: '借贷金额', input: 'number', operators: ['gte', 'lte', 'between'] },
  {
    key: 'creator',
    label: '制单人',
    input: 'select',
    operators: ['eq', 'ne'],
    options: [
      { value: 'lin', label: '林小雨' },
      { value: 'chen', label: '陈默' },
    ],
  },
  { key: 'summary', label: '摘要', input: 'text', operators: ['contains', 'isEmpty', 'isNotEmpty'] },
];

/** 板 FilterBuilder.dc.html 条件构造行的原样内容：日期 between + 科目 in + (金额 ≥ 或 制单人 =) */
const boardFilterValue: FilterRoot = {
  op: 'and',
  items: [
    {
      id: 'demo-date',
      field: 'voucherDate',
      operator: 'between',
      value: ['08-01', '08-31'],
    },
    { id: 'demo-account', field: 'account', operator: 'in', value: ['2202'] },
    {
      id: 'demo-group',
      op: 'or',
      items: [
        { id: 'demo-amount', field: 'amount', operator: 'gte', value: '10000.00' },
        { id: 'demo-creator', field: 'creator', operator: 'eq', value: 'lin' },
      ],
    },
  ],
};

const emptyFilterValue: FilterRoot = { op: 'and', items: [] };

const statusItems = [
  { value: 'all', label: '全部', count: '55,683' },
  { value: 'draft', label: '草稿', count: '12' },
  { value: 'audited', label: '已审核', count: '43' },
  { value: 'posted', label: '已过账', count: '55,224' },
  { value: 'void', label: '已作废', count: '404', disabled: true },
];

const panelLabels: FilterValuePanelLabels = {
  searchPlaceholder: '搜索',
  includeSub: '含下级',
  commitHint: '关闭面板即生效',
  quickRanges: [
    { key: 'today', label: '今天' },
    { key: 'last7', label: '最近 7 天' },
    { key: 'last30', label: '最近 30 天' },
    { key: 'thisMonth', label: '本月' },
    { key: 'lastMonth', label: '上月' },
    { key: 'thisQuarter', label: '本季度' },
  ],
  rangeFrom: '开始',
  rangeTo: '结束',
  textOps: { contains: '包含', eq: '等于', isEmpty: '为空' },
  enterHint: 'Enter 提交',
  clearText: '清空',
  empty: '无匹配',
};

function FilterMenuDemo({
  initial = emptyFilterValue,
  basic = false,
}: {
  initial?: FilterRoot;
  basic?: boolean;
}) {
  const [value, setValue] = useState<FilterRoot>(initial);
  return (
    <FilterMenu
      fields={filterFields}
      value={value}
      onChange={setValue}
      schemes={[
        { id: 'monthly', name: '本月大额凭证', conditionCount: 3, scope: 'mine' },
        { id: 'finance', name: '财务部在职', conditionCount: 2, scope: 'mine' },
      ]}
      onApplyScheme={noop}
      onOpenAdvanced={basic ? undefined : noop}
      operatorLabels={operatorLabels}
      labels={{
        trigger: '筛选',
        searchPlaceholder: '搜索字段或方案…',
        schemesTitle: '我的方案',
        fieldsTitle: '按字段筛选',
        advanced: '高级条件组合…',
        conditionCount: (n) => `${n} 条件`,
        commitHint: '关闭面板即生效',
      }}
      panelLabels={panelLabels}
      activeCount={value.items.length}
    />
  );
}

const chipsLabels = {
  advanced: '高级',
  clear: '清除',
  modified: '已修改',
  save: '保存',
  saveAs: '另存',
  more: (n: number) => `+${n}`,
  collapse: '收起',
  removeCondition: (label: string) => `移除 ${label}`,
  schemesTitle: '我的方案',
  manageSchemes: '管理方案…',
  includeSub: '含下级',
  operators: operatorLabels,
};

const demoSchemes = [
  { id: 'finance', name: '财务部在职' },
  { id: 'monthly', name: '本月大额凭证' },
];

/** 折叠态演示：条件多到超过两行，末尾折成「+N」（D9） */
const manyChipsValue: FilterRoot = {
  op: 'and',
  items: Array.from({ length: 9 }, (_, index) => ({
    id: `demo-many-${index}`,
    field: 'summary',
    operator: 'contains' as const,
    value: `关键词样例 ${index + 1}`,
  })),
};

function FilterChipsDemo({
  initial,
  maxRows,
  readOnly = false,
}: {
  initial: FilterRoot;
  maxRows?: number;
  readOnly?: boolean;
}) {
  const [value, setValue] = useState<FilterRoot>(initial);
  const [notice, setNotice] = useState('');
  return (
    <>
      <FilterChips
        value={value}
        fields={filterFields}
        onChange={setValue}
        onOpenAdvanced={noop}
        onClear={() => setValue(emptyFilterValue)}
        scheme={{ id: 'finance', name: readOnly ? '共享只读方案' : '财务部在职', modified: true }}
        onSchemeSave={readOnly ? undefined : () => setNotice('已保存当前条件')}
        onSchemeSaveAs={() => setNotice('已另存当前条件')}
        schemes={demoSchemes}
        onApplyScheme={noop}
        onManageSchemes={noop}
        panelLabels={panelLabels}
        labels={chipsLabels}
        maxRows={maxRows}
      />
      <span role="status">{notice}</span>
    </>
  );
}

/** 二级选值面板四形态（tree / select / dateRange / text），面板体本身可截图 */
function FilterValuePanelDemo({ fieldKey }: { fieldKey: string }) {
  const field = filterFields.find((item) => item.key === fieldKey);
  if (!field) return null;
  return (
    <div className="w-(--filter-panel-w) rounded-md border border-border bg-surface">
      <FilterValuePanel
        field={field}
        condition={null}
        labels={panelLabels}
        onCommit={noop}
        autoFocus={false}
      />
    </div>
  );
}

function ColumnSettingsDemo() {
  const [density, setDensity] = useState<'default' | 'relaxed' | 'loose'>('default');
  const [columns, setColumns] = useState([
    { id: 'name', label: '用户', visible: true },
    { id: 'dept', label: '部门', visible: true },
    { id: 'email', label: '邮箱', visible: false },
  ]);
  return (
    <ColumnSettings
      density={density}
      onDensityChange={setDensity}
      columns={columns}
      onColumnsChange={setColumns}
      onReset={() => {
        setDensity('default');
        setColumns([
          { id: 'name', label: '用户', visible: true },
          { id: 'dept', label: '部门', visible: true },
          { id: 'email', label: '邮箱', visible: false },
        ]);
      }}
      labels={{
        trigger: '列设置',
        densityTitle: '密度',
        densities: { default: '紧凑', relaxed: '标准', loose: '宽松' },
        columnsTitle: '列',
        summary: (shown, total) => `已显示 ${shown} / ${total}`,
        dragHint: '拖拽排序',
        reset: '重置为默认',
        persistHint: '显隐与顺序按用户记忆；列宽不持久化',
      }}
    />
  );
}

const blockClassName = 'rounded-md border border-border bg-surface p-4';
const blockTitleClassName = 'mb-3 text-xs font-medium text-text-3';
/** 让 fixed 定位的悬浮条在矩阵里可截图：容器提供定位上下文并抵消 fixed 的视口偏移 */
const barPreviewClassName =
  'relative flex h-[calc(64px*var(--app-scale))] items-center justify-center overflow-hidden rounded-md bg-canvas [&_[data-slot=floating-action-bar]]:static [&_[data-slot=floating-action-bar]]:translate-x-0';

function FilterBuilderDemo({
  initial,
  openId,
  layout = 'chips',
}: {
  initial: FilterRoot;
  openId?: string;
  layout?: 'chips' | 'rows';
}) {
  const [value, setValue] = useState<FilterRoot>(initial);

  return (
    <FilterBuilder
      value={value}
      onChange={setValue}
      fields={filterFields}
      operatorLabels={operatorLabels}
      labels={filterLabels}
      panelLabels={panelLabels}
      defaultOpenConditionId={openId}
      layout={layout}
      rowLabels={rowLabels}
    />
  );
}

function StatusTabsDemo({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <StatusTabs items={statusItems} value={value} onValueChange={setValue} aria-label="凭证状态" />;
}

export default function ListChromeMatrix(): JSX.Element {
  return (
    <section
      data-testid="listChromeMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">列表 chrome 族状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">
          统一基座板 FilterBuilder / UserList 工具区四层 / ActionDark 悬浮批量条的落地状态。
        </p>
      </div>

      <div className="grid gap-4">
        <div data-testid="listChrome.filterBuilder.default" className={blockClassName}>
          <p className={blockTitleClassName}>FilterBuilder · 默认（板原样：三条件 + 一括号组）</p>
          <FilterBuilderDemo initial={boardFilterValue} />
        </div>

        <div data-testid="listChrome.filterBuilder.rows" className={blockClassName}>
          <p className={blockTitleClassName}>FilterBuilder · 行式（高级筛选弹窗：一条件一行 + 括号组卡片）</p>
          <FilterBuilderDemo initial={boardFilterValue} layout="rows" />
        </div>

        <div data-testid="listChrome.filterBuilder.empty" className={blockClassName}>
          <p className={blockTitleClassName}>FilterBuilder · 空态（只剩「添加条件」虚线 chip）</p>
          <FilterBuilderDemo initial={emptyFilterValue} />
        </div>

        {/* 常开 popover 会往下压住相邻块，这里给它留出浮层高度 */}
        <div
          data-testid="listChrome.filterBuilder.active"
          className={`${blockClassName} pb-[calc(170px*var(--app-scale))]`}
        >
          <p className={blockTitleClassName}>
            FilterBuilder · 编辑态高亮（板上首个日期条件的 #fffaf4 / #f7c99a）
          </p>
          <FilterBuilderDemo initial={boardFilterValue} openId="demo-date" />
        </div>

        <div data-testid="listChrome.filterBuilder.grouped" className={blockClassName}>
          <p className={blockTitleClassName}>FilterBuilder · 带括号分组（组内连接词「或」可点切换）</p>
          <FilterBuilderDemo
            initial={{ op: 'and', items: [boardFilterValue.items[2] ?? { op: 'or', id: 'g', items: [] }] }}
          />
        </div>

        <div data-testid="listChrome.statusTabs.default" className={blockClassName}>
          <p className={blockTitleClassName}>StatusTabs · 选中「全部」+ 禁用项「已作废」</p>
          <StatusTabsDemo initial="all" />
        </div>

        <div data-testid="listChrome.statusTabs.selected" className={blockClassName}>
          <p className={blockTitleClassName}>StatusTabs · 选中非首项（「已过账」）</p>
          <StatusTabsDemo initial="posted" />
        </div>

        <div data-testid="listChrome.listChrome.full" className={blockClassName}>
          <p className={blockTitleClassName}>ListChrome · 工具条 + chips</p>
          <div className="rounded-md bg-surface">
            <ListChrome
              toolbar={
                <ListToolbar
                  leading={
                    <SearchField
                      placeholder="凭证号 / 摘要…"
                      containerClassName="w-[calc(232px*var(--app-scale))]"
                    />
                  }
                  trailing={
                    <>
                      <Button variant="secondary">导入导出</Button>
                      <Button>
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        新建凭证
                      </Button>
                    </>
                  }
                />
              }
              filters={<FilterBuilderDemo initial={boardFilterValue} />}
            />
          </div>
        </div>

        <div data-testid="listChrome.listChrome.toolbarOnly" className={blockClassName}>
          <p className={blockTitleClassName}>ListChrome · 只有工具条</p>
          <div className="rounded-md bg-surface">
            <ListChrome
              toolbar={
                <ListToolbar
                  leading={
                    <SearchField
                      placeholder="姓名 / 工号 / 手机…"
                      containerClassName="w-[calc(232px*var(--app-scale))]"
                    />
                  }
                />
              }
            />
          </div>
        </div>

        <div data-testid="listChrome.listToolbar.default" className={blockClassName}>
          <p className={blockTitleClassName}>ListToolbar · 默认（搜索 + 右侧操作）</p>
          <ListToolbar
            leading={
              <SearchField
                placeholder="姓名 / 工号 / 手机…"
                containerClassName="w-[calc(232px*var(--app-scale))]"
              />
            }
            trailing={<Button variant="secondary">筛选</Button>}
          />
        </div>

        <div data-testid="listChrome.filterMenu.default" className={blockClassName}>
          <p className={blockTitleClassName}>FilterMenu · 默认入口</p>
          <FilterMenuDemo />
        </div>

        <div data-testid="listChrome.filterMenu.basic" className={blockClassName}>
          <p className={blockTitleClassName}>FilterMenu · 普通筛选不提供高级入口</p>
          <FilterMenuDemo basic />
        </div>

        <div data-testid="listChrome.filterMenu.active" className={blockClassName}>
          <p className={blockTitleClassName}>FilterMenu · 已生效字段从可添加列表中排除</p>
          <FilterMenuDemo
            initial={{
              op: 'and',
              items: [{ id: 'demo-active-creator', field: 'creator', operator: 'eq', value: 'lin' }],
            }}
          />
        </div>

        <div data-testid="listChrome.filterChips.default" className={blockClassName}>
          <p className={blockTitleClassName}>FilterChips · 已生效条件（方案徽标可点开方案菜单）</p>
          <FilterChipsDemo initial={boardFilterValue} />
          <p className={blockTitleClassName}>FilterChips · 共享只读方案仅提供另存为</p>
          <FilterChipsDemo initial={boardFilterValue} readOnly />
        </div>

        <div data-testid="listChrome.filterChips.overflow" className={blockClassName}>
          <p className={blockTitleClassName}>
            FilterChips · 两行封顶后折成「+N」（D9，点「+N」展开、「收起」折回）
          </p>
          <div className="w-[calc(420px*var(--app-scale))]">
            <FilterChipsDemo initial={manyChipsValue} maxRows={2} />
          </div>
        </div>

        <div data-testid="listChrome.filterValuePanel.tree" className={blockClassName}>
          <p className={blockTitleClassName}>FilterValuePanel · tree（搜索 + 树多选 + 含下级）</p>
          <FilterValuePanelDemo fieldKey="account" />
        </div>

        <div data-testid="listChrome.filterValuePanel.select" className={blockClassName}>
          <p className={blockTitleClassName}>FilterValuePanel · select（单选即关）</p>
          <FilterValuePanelDemo fieldKey="creator" />
        </div>

        <div data-testid="listChrome.filterValuePanel.dateRange" className={blockClassName}>
          <p className={blockTitleClassName}>FilterValuePanel · dateRange（快捷项 + 起止，高级弹窗同源）</p>
          <FilterValuePanelDemo fieldKey="voucherDate" />
        </div>

        <div data-testid="listChrome.filterValuePanel.text" className={blockClassName}>
          <p className={blockTitleClassName}>FilterValuePanel · text（包含 / 等于 / 为空）</p>
          <FilterValuePanelDemo fieldKey="summary" />
        </div>

        <div data-testid="listChrome.columnSettings.default" className={blockClassName}>
          <p className={blockTitleClassName}>ColumnSettings · 密度 + 列</p>
          <ColumnSettingsDemo />
        </div>

        <div data-testid="listChrome.floatingActionBar.default" className={blockClassName}>
          <p className={blockTitleClassName}>
            FloatingActionBar · 默认（首个动作带底、含 danger 与「更多」）
          </p>
          <div className={barPreviewClassName}>
            <FloatingActionBar
              count={2}
              selectedLabel="已选"
              countLabel="张凭证"
              actions={[
                { id: 'audit', label: '审核', onSelect: noop },
                { id: 'post', label: '过账', onSelect: noop },
                { id: 'print', label: '打印', onSelect: noop },
                { id: 'void', label: '作废', onSelect: noop, tone: 'danger' },
              ]}
              moreActions={[
                { id: 'export', label: '导出所选', onSelect: noop },
                { id: 'delete', label: '删除', onSelect: noop, tone: 'danger' },
              ]}
              moreLabel="更多"
              onClearSelection={noop}
              closeLabel="取消选择"
            />
          </div>
        </div>

        <div data-testid="listChrome.floatingActionBar.disabled" className={blockClassName}>
          <p className={blockTitleClassName}>FloatingActionBar · 动作禁用 + 无「更多」</p>
          <div className={barPreviewClassName}>
            <FloatingActionBar
              count={1}
              selectedLabel="已选"
              countLabel="名用户"
              actions={[
                { id: 'enable', label: '启用', onSelect: noop },
                { id: 'disable', label: '停用', onSelect: noop, disabled: true },
                { id: 'reset', label: '重置密码', onSelect: noop, tone: 'muted' },
              ]}
              onClearSelection={noop}
              closeLabel="取消选择"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
