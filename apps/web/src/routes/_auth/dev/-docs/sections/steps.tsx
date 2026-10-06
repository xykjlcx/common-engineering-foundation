import { useState, type JSX, type ReactNode } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Steps, type StepItem } from '@/components/pro/Steps';

// 步骤条族状态矩阵（Steps 五行）。
// 说明：这是 dev-only 状态矩阵，示例文案直接取自原型板（DSAdditions 4.5）的板上原文，
// 作为夹具数据不进 i18n 资源；组件本身的文案全部由 props 注入。

const noop = () => undefined;

// 4.5 ①「横向 · 四步」板上四步原文
const wizardSteps: StepItem[] = [
  { key: 'basic', title: '填写基本信息' },
  { key: 'role', title: '分配角色' },
  { key: 'scope', title: '设置数据权限' },
  { key: 'done', title: '完成' },
];

// 4.5 ②「横向 · 出错」：错误只描当前步，前面两步仍是 finish
const wizardErrorSteps: StepItem[] = [
  { key: 'basic', title: '填写基本信息', status: 'finish' },
  { key: 'role', title: '分配角色', status: 'finish' },
  { key: 'scope', title: '设置数据权限', status: 'error' },
  { key: 'done', title: '完成', status: 'wait' },
];

// 4.5 ③「横向 · 小号」板上导入向导四步
const importSteps: StepItem[] = [
  { key: 'upload', title: '上传文件' },
  { key: 'mapping', title: '字段映射' },
  { key: 'preview', title: '预览校验' },
  { key: 'import', title: '导入' },
];

// 4.5 ④「纵向 · 带说明」板上审批流四步
const approvalSteps: StepItem[] = [
  { key: 'submit', title: '提交申请', description: '林小雨 · 09-01 10:20' },
  { key: 'dept', title: '部门审批', description: '等待 王志强 处理' },
  { key: 'finance', title: '财务复核' },
  { key: 'archive', title: '归档' },
];

// 4.5 ⑤「纵向 · 点式」板上凭证时间线四条
const timelineSteps: StepItem[] = [
  { key: 'created', title: '已创建', description: '09-01 10:20 · 系统' },
  { key: 'audited', title: '已审核', description: '09-02 09:05 · 王志强' },
  { key: 'posted', title: '已过账', description: '等待期末结账' },
  { key: 'archived', title: '已归档' },
];

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`stepsResult.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

export default function StepsMatrix(): JSX.Element {
  const [current, setCurrent] = useState(1);

  return (
    <section data-testid="stepsMatrix" className="mt-8 rounded-md border border-border bg-surface-2 p-4">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">步骤条族状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">
          Steps（横向四步 / 出错 / 小号 / 纵向带说明 / 纵向点式 / 可点击 / 禁用 / 自定义标记）
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4">
          <Cell id="Steps.horizontal" title="横向 · 四步（current=1：已完成 / 进行中 / 未到）">
            <Steps items={wizardSteps} current={1} aria-label="新建用户向导" />
          </Cell>

          <Cell id="Steps.horizontalError" title="横向 · 出错（只描当前步，前两步仍是已完成）">
            <Steps items={wizardErrorSteps} aria-label="新建用户向导（出错）" />
          </Cell>

          <Cell id="Steps.horizontalSm" title="横向 · 小号（圈 20 / 标题 12.5，弹窗内向导用）">
            <Steps items={importSteps} current={1} size="sm" aria-label="导入向导" />
          </Cell>

          <Cell
            id="Steps.clickable"
            title={`横向 · 可点击（onChange 才可点，第 4 步 disabled；当前 current=${current}）`}
          >
            <Steps
              items={[...wizardSteps.slice(0, 3), { key: 'done', title: '完成', disabled: true }]}
              current={current}
              onChange={(next) => setCurrent(next)}
              aria-label="可点击向导"
            />
          </Cell>

          <Cell id="Steps.customIcon" title="横向 · 自定义标记（icon 覆盖序号 / 勾 / 叉）">
            <Steps
              items={[
                {
                  key: 'audit',
                  title: '审核',
                  icon: <FileCheck2 aria-hidden="true" className="size-[calc(12px*var(--app-scale))]" />,
                  status: 'finish',
                },
                { key: 'post', title: '过账', status: 'process' },
                { key: 'close', title: '结账', status: 'wait' },
              ]}
              aria-label="凭证流转"
            />
          </Cell>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Cell id="Steps.verticalDescription" title="纵向 · 带说明（审批流 / 详情页侧栏）">
            <Steps items={approvalSteps} current={1} direction="vertical" aria-label="审批流" />
          </Cell>

          <Cell id="Steps.verticalProgressDot" title="纵向 · 点式（8px 点，当前点外扩 3px 软环）">
            <Steps
              items={timelineSteps}
              current={2}
              direction="vertical"
              progressDot
              aria-label="凭证时间线"
            />
          </Cell>

          <Cell id="Steps.verticalSm" title="纵向 · 小号（圈 20 / 标题 12.5）">
            <Steps
              items={approvalSteps}
              current={1}
              direction="vertical"
              size="sm"
              aria-label="审批流（小号）"
            />
          </Cell>

          <Cell id="Steps.disabled" title="纵向 · 可点击 + 禁用步（button disabled，不可聚焦）">
            <Steps
              items={[
                { key: 'submit', title: '提交申请', description: '林小雨 · 09-01 10:20' },
                { key: 'dept', title: '部门审批', description: '等待 王志强 处理' },
                { key: 'finance', title: '财务复核', disabled: true },
              ]}
              current={1}
              direction="vertical"
              onChange={noop}
              aria-label="审批流（可点击）"
            />
          </Cell>
        </div>
      </div>
    </section>
  );
}
