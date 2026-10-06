import { useState } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { SelectControl, type SelectOption } from '@/components/ui/select';
import type { UsageDoc } from '../types';

/* 选择器「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

const statusOptions: SelectOption[] = [
  { value: 'active', label: '在职' },
  { value: 'probation', label: '试用' },
  { value: 'left', label: '离职' },
];

function BasicDemo() {
  const [status, setStatus] = useState('active');

  return (
    <div className="flex flex-col gap-3">
      <SelectControl
        aria-label="用工状态"
        value={status}
        options={statusOptions}
        placeholder="请选择用工状态"
        onValueChange={setStatus}
      />
      <p className="text-xs text-(--text-3)">当前值：{status || '（空）'}</p>
    </div>
  );
}

function SizesDemo() {
  const [scope, setScope] = useState('');

  const scopeOptions: SelectOption[] = [
    { value: '', label: '全部范围' },
    { value: 'dept', label: '本部门' },
    { value: 'deptAndSub', label: '本部门及下级' },
    { value: 'custom', label: '自定义（暂不可选）', disabled: true },
  ];

  return (
    <div className="flex flex-col gap-3">
      <SelectControl
        size="sm"
        aria-label="数据范围（小号）"
        value={scope}
        options={scopeOptions}
        placeholder="数据范围"
        onValueChange={setScope}
      />
      <SelectControl
        size="md"
        aria-label="数据范围（默认）"
        value={scope}
        options={scopeOptions}
        placeholder="数据范围"
        onValueChange={setScope}
      />
      <SelectControl
        size="lg"
        aria-label="数据范围（大号）"
        value={scope}
        options={scopeOptions}
        placeholder="数据范围"
        onValueChange={setScope}
      />
      <SelectControl
        aria-label="已禁用"
        value="active"
        options={statusOptions}
        disabled
        onValueChange={() => undefined}
      />
    </div>
  );
}

function NativeDemo() {
  const [pageSize, setPageSize] = useState('20');

  return (
    <Field>
      <FieldLabel htmlFor="usage-select-page-size">每页条数</FieldLabel>
      <NativeSelect
        id="usage-select-page-size"
        selectSize="sm"
        value={pageSize}
        onChange={(event) => setPageSize(event.target.value)}
      >
        <option value="20">20 条/页</option>
        <option value="50">50 条/页</option>
        <option value="100">100 条/页</option>
      </NativeSelect>
    </Field>
  );
}

export const usage: UsageDoc = {
  when:
    '单选下拉一律用 SelectControl：它把 Radix Select 的 Root / Trigger / Content / Item 收成一个 options 数组，' +
    '业务层不需要自己拼原语，也就不会漏掉键盘与读屏行为。' +
    '只有在选项由后端渲染、或必须复用系统原生下拉（移动端长列表、打印页）时才降级到 NativeSelect，它是同一套 ui-field 皮但没有浮层。' +
    '选项超过约二十条、需要搜索或多选时，SelectControl 就不合适了，改用 pro/FilterSelect（带搜索的筛选下拉）或 pro/ChipsField（多选）。',
  examples: [
    {
      title: '受控单选',
      description: 'value 是字符串（不是对象），onValueChange 直接给新字符串；空串是合法值，代表「未选」。',
      code: `import { useState } from 'react';
import { SelectControl, type SelectOption } from '@/components/ui/select';

const statusOptions: SelectOption[] = [
  { value: 'active', label: '在职' },
  { value: 'probation', label: '试用' },
  { value: 'left', label: '离职' },
];

export function StatusSelect() {
  const [status, setStatus] = useState('active');

  return (
    <SelectControl
      aria-label="用工状态"
      value={status}
      options={statusOptions}
      placeholder="请选择用工状态"
      onValueChange={setStatus}
    />
  );
}`,
      render: BasicDemo,
    },
    {
      title: '尺寸、禁用项与「全部」空值',
      description:
        'value: "" 的选项就是筛选条里的「全部」；单个选项用 disabled 置灰，整个控件用 disabled 关掉。',
      code: `import { useState } from 'react';
import { SelectControl, type SelectOption } from '@/components/ui/select';

const scopeOptions: SelectOption[] = [
  { value: '', label: '全部范围' },
  { value: 'dept', label: '本部门' },
  { value: 'deptAndSub', label: '本部门及下级' },
  { value: 'custom', label: '自定义（暂不可选）', disabled: true },
];

export function ScopeSelect() {
  const [scope, setScope] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <SelectControl size="sm" aria-label="数据范围" value={scope} options={scopeOptions} placeholder="数据范围" onValueChange={setScope} />
      <SelectControl size="md" aria-label="数据范围" value={scope} options={scopeOptions} placeholder="数据范围" onValueChange={setScope} />
      <SelectControl size="lg" aria-label="数据范围" value={scope} options={scopeOptions} placeholder="数据范围" onValueChange={setScope} />
    </div>
  );
}`,
      render: SizesDemo,
    },
    {
      title: '原生下拉 NativeSelect',
      description: '走系统弹层，没有 Portal 也没有动画；用普通的 onChange 事件对象，不是 onValueChange。',
      code: `import { useState } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';

export function PageSizeSelect() {
  const [pageSize, setPageSize] = useState('20');

  return (
    <Field>
      <FieldLabel htmlFor="page-size">每页条数</FieldLabel>
      <NativeSelect
        id="page-size"
        selectSize="sm"
        value={pageSize}
        onChange={(event) => setPageSize(event.target.value)}
      >
        <option value="20">20 条/页</option>
        <option value="50">50 条/页</option>
        <option value="100">100 条/页</option>
      </NativeSelect>
    </Field>
  );
}`,
      render: NativeDemo,
    },
  ],
  notes: [
    '与 antd 的差异：没有 Select.Option 子组件，选项只能经 options 数组传；label 可以是 ReactNode（带图标、带徽章都行），value 必须是字符串。',
    'Radix 原生不接受空串作为 item value，SelectControl 内部把空串映射成哨兵值再映射回来，所以业务层可以放心用 "" 表示「全部」。',
    'NativeSelect 的尺寸属性叫 selectSize，理由同 Input：size 是原生 select 元素的可见行数属性。',
    '没有 antd 的 showSearch / mode="multiple" / labelInValue：搜索型筛选用 pro/FilterSelect，多选用 pro/ChipsField，需要回填对象请自己按 value 查表。',
    'SelectControl 的 aria-label 或外层 FieldLabel 至少要有一个，否则读屏只会读到占位文案。',
    'className 默认落在触发器上；要改浮层宽度或最大高度请用 contentClassName，别去覆盖 --overlay-* token。',
  ],
};
