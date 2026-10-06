import { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UsageDoc } from '../types';

/* 按钮「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

function VariantsDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>
        <Plus data-icon="inline-start" />
        新建用户
      </Button>
      <Button variant="secondary">
        <Download data-icon="inline-start" />
        导出
      </Button>
      <Button variant="dashed">添加筛选条件</Button>
      <Button variant="text">重置</Button>
      <Button variant="link">查看详情</Button>
      <Button variant="danger">
        <Trash2 data-icon="inline-start" />
        删除
      </Button>
      <Button variant="danger-ghost">停用</Button>
    </div>
  );
}

function SizesDemo() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">超小 xs</Button>
        <Button size="sm">小 sm</Button>
        <Button size="md">默认 md</Button>
        <Button size="lg">大 lg</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon-xs" aria-label="新增">
          <Plus data-icon="inline-start" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="新增">
          <Plus data-icon="inline-start" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="新增">
          <Plus data-icon="inline-start" />
        </Button>
      </div>
    </div>
  );
}

function LoadingDemo() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button loading={loading} onClick={() => setLoading(true)}>
        保存
      </Button>
      <Button variant="secondary" disabled>
        禁用
      </Button>
      <Button variant="text" onClick={() => setLoading(false)}>
        复位
      </Button>
    </div>
  );
}

function BlockDemo() {
  return (
    <div className="flex w-[calc(240px*var(--app-scale))] flex-col gap-2">
      <Button block>登录</Button>
      <Button block variant="secondary">
        使用短信验证码
      </Button>
    </div>
  );
}

export const usage: UsageDoc = {
  when:
    '页面上任何一次「触发动作」都走 Button，不再手写原生 button 元素。一屏只留一个 variant="primary"（板上的橙色实心）作主动作，' +
    '次动作用 secondary，工具条里成排的弱动作用 text / ghost，表格行内的跳转类动作用 link。' +
    '破坏性动作按后果分两档：直接执行且不可撤销的用 danger（实心红），需要先弹确认再执行的入口用 danger-ghost（描边红）。' +
    '仅有图标没有文字时必须同时给 size="icon-*" 和 aria-label，否则读屏读不出这个钮是干什么的。',
  examples: [
    {
      title: '变体：一屏一个主动作',
      description: '八个 variant 覆盖了后台的全部动作强度，不要再靠 className 调色去造第九种。',
      code: `import { Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Toolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>
        <Plus data-icon="inline-start" />
        新建用户
      </Button>
      <Button variant="secondary">
        <Download data-icon="inline-start" />
        导出
      </Button>
      <Button variant="dashed">添加筛选条件</Button>
      <Button variant="text">重置</Button>
      <Button variant="link">查看详情</Button>
      <Button variant="danger">
        <Trash2 data-icon="inline-start" />
        删除
      </Button>
      <Button variant="danger-ghost">停用</Button>
    </div>
  );
}`,
      render: VariantsDemo,
    },
    {
      title: '尺寸与图标钮',
      description:
        '表单里用默认 md，工具条与表格行内用 sm / xs；纯图标钮换成同档的 icon-* 尺寸并补 aria-label。',
      code: `import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Sizes() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">超小 xs</Button>
        <Button size="sm">小 sm</Button>
        <Button size="md">默认 md</Button>
        <Button size="lg">大 lg</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon-xs" aria-label="新增">
          <Plus data-icon="inline-start" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="新增">
          <Plus data-icon="inline-start" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="新增">
          <Plus data-icon="inline-start" />
        </Button>
      </div>
    </div>
  );
}`,
      render: SizesDemo,
    },
    {
      title: '加载与禁用',
      description: 'loading 自带前置转圈并挂 aria-busy，同时把钮变成不可点，不必再额外传 disabled。',
      code: `import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function SaveButton() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button loading={loading} onClick={() => setLoading(true)}>
        保存
      </Button>
      <Button variant="secondary" disabled>
        禁用
      </Button>
      <Button variant="text" onClick={() => setLoading(false)}>
        复位
      </Button>
    </div>
  );
}`,
      render: LoadingDemo,
    },
    {
      title: '块级按钮',
      description: '登录页、抽屉底部这类整宽动作区用 block，不要写 w-full 的 className。',
      code: `import { Button } from '@/components/ui/button';

export function LoginActions() {
  return (
    <div className="flex w-[calc(240px*var(--app-scale))] flex-col gap-2">
      <Button block>登录</Button>
      <Button block variant="secondary">
        使用短信验证码
      </Button>
    </div>
  );
}`,
      render: BlockDemo,
    },
  ],
  notes: [
    '与 antd 的差异：antd 用 danger 布尔值 + type 组合表达危险动作，本仓拆成 danger（实心）与 danger-ghost（描边）两个独立 variant，不存在 danger 布尔属性。',
    'antd 的 type="default" 在本仓叫 variant="secondary"；default 仍能用但只是 primary 的别名，新代码别用。',
    'icon 只吃带 data-icon 属性的元素：尺寸由 [&_[data-icon]] 规则统一给，自己再写 size-4 会和 --app-scale 打架。',
    'loading 与 disabled 同时生效时按 disabled 呈现；不要用 loading 表达「无权限」，那种情况用 disabled。',
    '需要把按钮渲染成链接时用 asChild 包一个 Link，不要给裸的 a 元素手抄 buttonVariants 的类名。',
    '业务层禁止用直接接主题色的 primitive 类（把 pri / surface-2 拼进 bg- 、text- 、border- 、hover: 前缀那一档）自造按钮：按钮的全部状态色都在 --button-* token 里，主题守卫对这些类名有棘轮计数。',
  ],
};
