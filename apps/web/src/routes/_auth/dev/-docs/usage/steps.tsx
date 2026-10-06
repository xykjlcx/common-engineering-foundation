import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Steps, type StepItem } from '@/components/pro/Steps';
import type { UsageDoc } from '../types';

/* 步骤条「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

const wizardItems: StepItem[] = [
  { key: 'base', title: '基本信息' },
  { key: 'contact', title: '联系方式' },
  { key: 'role', title: '角色与权限' },
  { key: 'done', title: '完成' },
];

function HorizontalDemo() {
  const [current, setCurrent] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      <Steps items={wizardItems} current={current} aria-label="新建用户向导" />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={current === 0}
          onClick={() => setCurrent(current - 1)}
        >
          上一步
        </Button>
        <Button
          size="sm"
          disabled={current === wizardItems.length - 1}
          onClick={() => setCurrent(current + 1)}
        >
          下一步
        </Button>
      </div>
    </div>
  );
}

const auditItems: StepItem[] = [
  { key: 'submit', title: '提交申请', description: '李长昕 · 09-01 10:22' },
  { key: 'lead', title: '直属主管审批', description: '王思远 · 09-01 14:05' },
  { key: 'finance', title: '财务复核', description: '待处理' },
  { key: 'archive', title: '归档', description: '未开始' },
];

function VerticalDemo() {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <Steps
        direction="vertical"
        items={auditItems}
        current={2}
        aria-label="审批流程"
        className="w-[calc(220px*var(--app-scale))]"
      />
      <Steps
        direction="vertical"
        progressDot
        items={auditItems}
        current={2}
        aria-label="审批时间线"
        className="w-[calc(220px*var(--app-scale))]"
      />
    </div>
  );
}

const importItems: StepItem[] = [
  { key: 'upload', title: '上传文件' },
  { key: 'parse', title: '解析校验', status: 'error' },
  { key: 'import', title: '写入数据' },
];

function ClickableDemo() {
  const [current, setCurrent] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <Steps
        size="sm"
        items={wizardItems}
        current={current}
        aria-label="可跳转向导"
        onChange={(next) => setCurrent(next)}
      />
      <Steps items={importItems} current={1} aria-label="导入进度" />
    </div>
  );
}

export const usage: UsageDoc = {
  when:
    '把一件长任务切成有序、用户能预判剩余量的几段时用 Steps：新建向导、导入流程、审批链路。' +
    '横向放在页面或弹窗顶部当进度指示，纵向放在详情页侧边当流程轨迹；纵向 + progressDot 就是时间线形态，' +
    '本仓不再单独提供 Timeline 组件。' +
    '不表达顺序、只是并列切换视图的用 ui/Tabs 或 pro/StatusTabs；只有一个百分比要展示的用 pro/SegmentedProgress。',
  examples: [
    {
      title: '横向向导',
      description:
        'current 是下标（从 0 起）；不传每步的 status 时，之前的自动 finish、当前 process、之后 wait。',
      code: `import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Steps, type StepItem } from '@/components/pro/Steps';

const items: StepItem[] = [
  { key: 'base', title: '基本信息' },
  { key: 'contact', title: '联系方式' },
  { key: 'role', title: '角色与权限' },
  { key: 'done', title: '完成' },
];

export function CreateUserWizard() {
  const [current, setCurrent] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      <Steps items={items} current={current} aria-label="新建用户向导" />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
          上一步
        </Button>
        <Button size="sm" disabled={current === items.length - 1} onClick={() => setCurrent(current + 1)}>
          下一步
        </Button>
      </div>
    </div>
  );
}`,
      render: HorizontalDemo,
    },
    {
      title: '纵向流程与点式时间线',
      description:
        'description 只在纵向（或横向传了 description）时渲染；progressDot 把序号圈换成 8px 圆点。',
      code: `import { Steps, type StepItem } from '@/components/pro/Steps';

const items: StepItem[] = [
  { key: 'submit', title: '提交申请', description: '李长昕 · 09-01 10:22' },
  { key: 'lead', title: '直属主管审批', description: '王思远 · 09-01 14:05' },
  { key: 'finance', title: '财务复核', description: '待处理' },
  { key: 'archive', title: '归档', description: '未开始' },
];

export function AuditTrail() {
  return (
    <div className="flex gap-6">
      <Steps direction="vertical" items={items} current={2} aria-label="审批流程" />
      <Steps direction="vertical" progressDot items={items} current={2} aria-label="审批时间线" />
    </div>
  );
}`,
      render: VerticalDemo,
    },
    {
      title: '可点击与出错态',
      description:
        '传了 onChange 每一步就变成按钮（单步可用 disabled 关掉）；给某步显式写 status: "error" 只染红那一步。',
      code: `import { useState } from 'react';
import { Steps, type StepItem } from '@/components/pro/Steps';

const importItems: StepItem[] = [
  { key: 'upload', title: '上传文件' },
  { key: 'parse', title: '解析校验', status: 'error' },
  { key: 'import', title: '写入数据' },
];

export function ImportSteps() {
  const [current, setCurrent] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <Steps size="sm" items={items} current={current} aria-label="可跳转向导" onChange={(next) => setCurrent(next)} />
      <Steps items={importItems} current={1} aria-label="导入进度" />
    </div>
  );
}`,
      render: ClickableDemo,
    },
  ],
  notes: [
    '与 antd 的差异：每个 item 必须有 key（antd 用数组下标做 key）；antd 的 subTitle 没有对应属性，副信息统一放 description。',
    'antd 的 size 是 default / small，这里是 md / sm；size="sm" 用在弹窗内的向导（圈 20、标题 12.5）。',
    'onChange 的签名是 (current, item) 两个参数，比 antd 多给了那一步的 item，省得再按下标回查。',
    '没有 percent、status="finish" 整体覆盖这些属性：整体进度由 current 推导，只有需要打断推导（某步失败）时才在该 item 上写 status。',
    'progressDot 是布尔不是渲染函数：本仓不支持自定义点的渲染，需要图标请用 item.icon（点式下 icon 不生效）。',
    '文案与 aria-label 全部由 props 注入，pro 层不做 i18n；纵向布局的宽度由外层容器决定，组件本身不设宽。',
  ],
};
