import { useState } from 'react';
import { Search } from 'lucide-react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input, InputGroup, InputGroupInput, InputGroupPrefix } from '@/components/ui/input';
import type { UsageDoc } from '../types';

/* 输入框「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

function BasicDemo() {
  const [name, setName] = useState('李长昕');

  return (
    <div className="flex flex-col gap-3">
      <Input
        aria-label="姓名"
        placeholder="请输入姓名"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="flex flex-col gap-2">
        <Input inputSize="sm" aria-label="小号" placeholder="小号 sm（工具条）" />
        <Input inputSize="md" aria-label="默认" placeholder="默认 md（表单）" />
        <Input inputSize="lg" aria-label="大号" placeholder="大号 lg（登录页）" />
      </div>
      <Input aria-label="已禁用" placeholder="已禁用" disabled />
    </div>
  );
}

function AffixDemo() {
  const [keyword, setKeyword] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <Input aria-label="金额" placeholder="0.00" prefix="¥" suffix={<span>元</span>} />
      <Input aria-label="站点地址" placeholder="example.com" addonBefore={<span>https://</span>} />
      <InputGroup inputSize="md">
        <InputGroupPrefix>
          <Search data-icon="inline-start" />
        </InputGroupPrefix>
        <InputGroupInput
          aria-label="搜索"
          placeholder="搜索姓名 / 工号"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </InputGroup>
    </div>
  );
}

function ValidationDemo() {
  const [email, setEmail] = useState('长昕');
  const invalid = !email.includes('@');

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor="usage-input-email" required>
        邮箱
      </FieldLabel>
      <Input
        id="usage-input-email"
        status={invalid ? 'error' : 'default'}
        placeholder="name@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {invalid ? (
        <FieldError>请输入包含 @ 的邮箱地址</FieldError>
      ) : (
        <FieldDescription>用于接收系统通知</FieldDescription>
      )}
    </Field>
  );
}

export const usage: UsageDoc = {
  when:
    '一切单行文本录入都用 Input，业务层禁止裸写原生 input 元素——五个状态（默认 / 悬停 / 聚焦 / 错误 / 禁用）的边框与光圈全在 --field-* token 里，手写标签一个都吃不到。' +
    '多行改用 Textarea，纯数字与步进改用 NumberField，带清除与防抖的列表搜索改用 pro/SearchField，' +
    '只有需要「一个普通文本框」时才落到 Input。' +
    '带图标或单位时用 prefix / suffix（在框内），带协议头、区号这类固定段用 addonBefore（在框外贴边），三者任传其一就会自动切到 InputGroup 结构。',
  examples: [
    {
      title: '受控输入与三尺寸',
      description: 'value + onChange 受控；尺寸只有 sm / md / lg 三档，工具条用 sm、表单用 md、登录页用 lg。',
      code: `import { useState } from 'react';
import { Input } from '@/components/ui/input';

export function NameField() {
  const [name, setName] = useState('李长昕');

  return (
    <div className="flex flex-col gap-3">
      <Input
        aria-label="姓名"
        placeholder="请输入姓名"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Input inputSize="sm" aria-label="小号" placeholder="小号 sm（工具条）" />
      <Input inputSize="md" aria-label="默认" placeholder="默认 md（表单）" />
      <Input inputSize="lg" aria-label="大号" placeholder="大号 lg（登录页）" />
      <Input aria-label="已禁用" placeholder="已禁用" disabled />
    </div>
  );
}`,
      render: BasicDemo,
    },
    {
      title: '前后缀与 addon',
      description:
        'prefix / suffix 落在边框内（单位、符号），addonBefore 落在边框外并自带分隔线（协议头、区号）；图标前缀走 InputGroup 自拼。',
      code: `import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input, InputGroup, InputGroupInput, InputGroupPrefix } from '@/components/ui/input';

export function AffixInputs() {
  const [keyword, setKeyword] = useState('');

  return (
    <div className="flex flex-col gap-3">
      {/* prefix 只能是字符串（见「注意事项」），suffix / addonBefore 可以是任意节点 */}
      <Input aria-label="金额" placeholder="0.00" prefix="¥" suffix={<span>元</span>} />
      <Input aria-label="站点地址" placeholder="example.com" addonBefore={<span>https://</span>} />

      {/* 前缀要放图标时自己拼 InputGroup，这也是 pro/SearchField 的做法 */}
      <InputGroup inputSize="md">
        <InputGroupPrefix>
          <Search data-icon="inline-start" />
        </InputGroupPrefix>
        <InputGroupInput
          aria-label="搜索"
          placeholder="搜索姓名 / 工号"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </InputGroup>
    </div>
  );
}`,
      render: AffixDemo,
    },
    {
      title: '错误态与字段壳',
      description:
        'status="error" 只负责边框变红并自动补 aria-invalid；错误文案由外面的 Field / FieldError 承担。',
      code: `import { useState } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function EmailField() {
  const [email, setEmail] = useState('长昕');
  const invalid = !email.includes('@');

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor="email" required>
        邮箱
      </FieldLabel>
      <Input
        id="email"
        status={invalid ? 'error' : 'default'}
        placeholder="name@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {invalid ? (
        <FieldError>请输入包含 @ 的邮箱地址</FieldError>
      ) : (
        <FieldDescription>用于接收系统通知</FieldDescription>
      )}
    </Field>
  );
}`,
      render: ValidationDemo,
    },
  ],
  notes: [
    '与 antd 的差异：尺寸属性叫 inputSize 不叫 size——size 是原生 input 元素的字符宽度属性，占了名字，透传时会真的生效。',
    'antd 的 status="error" 只改配色，本仓的 status="error" 还会自动写上 aria-invalid；已经手动传了 aria-invalid 的以手写值为准。',
    'antd 的 allowClear 本仓没有：需要清除按钮的搜索框请用 pro/SearchField，它连防抖一起给了。',
    '没有 Input.Search / Input.Password / Input.TextArea 这些静态子组件，对应的件分别是 pro/SearchField、type="password" 的 Input 与 ui/Textarea。',
    'prefix 的类型被原生 input 元素的同名 RDFa 属性挤成了 string：想放图标别硬塞 JSX（编译不过），直接用 InputGroup + InputGroupPrefix + InputGroupInput 自己拼，pro/SearchField 就是这么做的。suffix 与 addonBefore 没有这个限制，可以传任意节点。',
    '一旦传了 prefix / suffix / addonBefore，className 会落到内层那个真实的 input 元素上而不是外框；要改外框请直接用 InputGroup 自己拼。',
    '受控时必须同时给 value 和 onChange，只给 value 会让输入框变成只读并在控制台报 React 警告。',
  ],
};
