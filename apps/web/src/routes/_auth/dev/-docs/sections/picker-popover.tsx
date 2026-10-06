import { useRef, useState, type JSX, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { ChipsField } from '@/components/pro/ChipsField';
import { PickerPopover, type PickerNode } from '@/components/pro/PickerPopover';

// 选择器族状态矩阵：单选 string|null / 多选 readonly string[]，真实回调与字段桥接。
// 说明：这是 dev-only 状态矩阵，示例文案直接取自原型板（PickerPopover / UserForm / DeptTree）的板上原文，
// 作为夹具数据不进 i18n 资源；组件本身的文案全部由 props 注入。

const noop = () => undefined;

const accountNodes: PickerNode[] = [
  { value: '6001', label: '主营业务收入', code: '6001' },
  {
    value: '6001.02',
    label: '主营业务收入 - 尾程',
    parentValue: '6001',
    code: '6001.02',
    frequent: true,
    meta: '贷',
  },
  {
    value: '6001.03',
    label: '主营业务收入 - 运费附加',
    parentValue: '6001',
    code: '6001.03',
    frequent: true,
    meta: '贷',
  },
  { value: '5401', label: '主营业务成本 - 尾程运费', code: '5401', meta: '借' },
  { value: '2202', label: '应付账款', code: '2202', meta: '贷' },
  { value: '6603', label: '其他业务收入', code: '6603' },
  { value: '6603.02', label: '其他业务收入 - 运费补贴', parentValue: '6603', code: '6603.02', meta: '贷' },
  { value: '1122.03', label: '应收账款 - 云仓优选', code: '1122.03', disabled: true, meta: '借' },
];

const roleNodes: PickerNode[] = [
  { value: 'maker', label: '财务制单员' },
  { value: 'checker', label: '财务审核员' },
  { value: 'printer', label: '打单操作员' },
  { value: 'warehouse', label: '仓储操作员' },
];

const pickerLabels = {
  searchPlaceholder: '搜索科目编码或名称',
  frequent: '常用',
  recent: '最近',
  empty: '无匹配科目',
  matchHint: (query: string, count: number) => `搜索「${query}」· ${count} 个匹配科目`,
  create: (query: string) => `新建科目「${query}」`,
  hints: ['↑↓ 选择', 'Enter 确认', 'Esc 关闭'],
  more: (count: number) => `+${count}`,
};

const roleLabels = {
  ...pickerLabels,
  searchPlaceholder: '搜索角色',
  empty: '无匹配角色',
  matchHint: (query: string, count: number) => `搜索「${query}」· ${count} 个匹配角色`,
  add: '添加',
  remove: (label: string) => `移除 ${label}`,
  create: undefined,
};

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`rowMenuPicker.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

export default function PickerPopoverMatrix(): JSX.Element {
  const { t } = useTranslation();
  const pickerRef = useRef<HTMLButtonElement>(null);
  const chipsRef = useRef<HTMLButtonElement>(null);
  const [pickerTouched, setPickerTouched] = useState(false);
  const [account, setAccount] = useState<string | null>('6001.02');
  const [accounts, setAccounts] = useState<readonly string[]>(['6001.02', '5401']);
  const [roles, setRoles] = useState<string[]>(['maker', 'checker']);
  const [invalidRoles, setInvalidRoles] = useState<string[]>([]);

  return (
    <section
      data-testid="pickerPopoverMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">选择器族状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">
          PickerPopover（树 / 搜索 / 多选 / 新建槽位 / toolbar 尺寸）· ChipsField
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Cell id="PickerPopover.tree" title="选择器：默认态（完整树）">
            <PickerPopover
              nodes={accountNodes}
              value={account}
              onChange={setAccount}
              labels={pickerLabels}
              recent={['6001.02', '5401', '2202']}
              onCreate={noop}
              placeholder="点击选择科目（F7）"
              aria-label="选择科目"
            />
          </Cell>

          <Cell id="PickerPopover.search" title="选择器：搜索高亮态（预填「运费」）">
            <PickerPopover
              nodes={accountNodes}
              value={account}
              onChange={setAccount}
              labels={pickerLabels}
              defaultQuery="运费"
              onCreate={noop}
              placeholder="点击选择科目（F7）"
              aria-label="选择科目（搜索态）"
            />
          </Cell>

          <Cell id="PickerPopover.multiple" title="选择器：多选（A、B +N）">
            <PickerPopover
              nodes={accountNodes}
              value={accounts}
              onChange={setAccounts}
              multiple
              labels={pickerLabels}
              placeholder="选择多个科目"
              aria-label="多选科目"
            />
          </Cell>

          <Cell id="PickerPopover.withCreate" title="选择器：带「+ 新建」槽位">
            <PickerPopover
              nodes={accountNodes}
              value={null}
              onChange={noop}
              labels={pickerLabels}
              defaultQuery="运费"
              onCreate={noop}
              placeholder="点击选择科目"
              aria-label="选择科目（带新建）"
            />
          </Cell>

          <Cell id="PickerPopover.withoutCreate" title="选择器：不传 onCreate（槽位不渲染）">
            <FieldLabel htmlFor="docs-picker-bridge">{t('dev.themeStates.fieldInvalid')}</FieldLabel>
            <PickerPopover
              id="docs-picker-bridge"
              ref={pickerRef}
              onBlur={() => setPickerTouched(true)}
              aria-invalid={pickerTouched}
              aria-describedby={pickerTouched ? 'docs-picker-bridge-error' : undefined}
              nodes={accountNodes}
              value={null}
              onChange={noop}
              labels={pickerLabels}
              defaultQuery="运费"
              placeholder="点击选择科目"
              aria-label="选择科目（无新建）"
            />
            <FieldError id="docs-picker-bridge-error">
              {pickerTouched ? t('dev.themeStates.fieldInvalidDesc') : null}
            </FieldError>
          </Cell>

          <Cell id="PickerPopover.remote" title="远程搜索：加载、分页反馈和已选回显">
            <PickerPopover
              nodes={accountNodes}
              value="6001"
              onChange={noop}
              labels={pickerLabels}
              searchMode="remote"
              busy
              footer={<span>加载候选中；失败可在此放重试，分页可放加载更多</span>}
              aria-label="远程候选"
            />
          </Cell>
          <Cell id="PickerPopover.toolbar" title="选择器：toolbar 尺寸（32px）">
            <PickerPopover
              nodes={accountNodes}
              value={null}
              onChange={noop}
              labels={pickerLabels}
              size="toolbar"
              placeholder="科目：全部"
              aria-label="选择科目（工具条）"
            />
          </Cell>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Cell id="ChipsField.empty" title="Chips：空">
            <ChipsField nodes={roleNodes} value={[]} onChange={noop} labels={roleLabels} aria-label="角色" />
          </Cell>

          <Cell id="ChipsField.filled" title="Chips：多值">
            <ChipsField
              nodes={roleNodes}
              value={roles}
              onChange={setRoles}
              labels={roleLabels}
              aria-label="角色"
            />
          </Cell>

          <Cell id="ChipsField.disabled" title="Chips：禁用">
            <ChipsField
              nodes={roleNodes}
              value={['maker']}
              onChange={noop}
              labels={roleLabels}
              disabled
              aria-label="角色（禁用）"
            />
          </Cell>

          <Cell id="ChipsField.invalid" title="Chips：invalid（可选，选后仍保持 invalid 样式）">
            <FieldLabel htmlFor="docs-chips-bridge">{t('dev.themeStates.fieldInvalid')}</FieldLabel>
            {/* 演示格必须真能选：之前 onChange 是 noop，看起来像「能点开却选不了」 */}
            <ChipsField
              nodes={roleNodes}
              value={invalidRoles}
              id="docs-chips-bridge"
              ref={chipsRef}
              aria-describedby="docs-chips-bridge-error"
              onChange={setInvalidRoles}
              labels={roleLabels}
              aria-invalid
              aria-label="角色（校验失败）"
            />
            <FieldError id="docs-chips-bridge-error">{t('dev.themeStates.fieldInvalidDesc')}</FieldError>
          </Cell>
        </div>
      </div>
    </section>
  );
}
