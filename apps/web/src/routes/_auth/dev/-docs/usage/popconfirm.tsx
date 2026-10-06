import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popconfirm } from '@/components/pro/Popconfirm';
import type { UsageDoc } from '../types';

/* 气泡确认「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

function BasicDemo() {
  const [rows, setRows] = useState(['运费附加费', '仓储服务费', '报关代理费']);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row} className="flex items-center justify-between gap-4">
          <span className="text-sm text-(--type-2-fg)">{row}</span>
          <Popconfirm
            title="确认删除这条记录？"
            description="删除后仍可在回收站里恢复。"
            cancelText="取消"
            confirmText="删除"
            severity="impact"
            onConfirm={() => setRows((current) => current.filter((item) => item !== row))}
          >
            <Button variant="link" size="sm">
              删除
            </Button>
          </Popconfirm>
        </div>
      ))}
      {rows.length === 0 ? <span className="text-xs text-(--text-3)">已全部删除</span> : null}
    </div>
  );
}

function IrreversibleDemo() {
  const [removed, setRemoved] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-(--type-2-fg)">技术中心 · 48 人</span>
      <Popconfirm
        title="彻底删除「技术中心」？"
        description="该部门下 48 名成员将一并解除归属，此操作不可撤销。"
        cancelText="取消"
        confirmText="彻底删除"
        severity="irreversible"
        confirmation={{ expected: '技术中心', placeholder: '输入部门名称以确认' }}
        onConfirm={() => setRemoved(true)}
      >
        <Button variant="danger-ghost" size="sm" disabled={removed}>
          删除部门
        </Button>
      </Popconfirm>
      {removed ? <span className="text-xs text-(--text-3)">已删除</span> : null}
    </div>
  );
}

function AsyncDemo() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-3">
      <Popconfirm
        title="重新推送这批面单？"
        cancelText="取消"
        confirmText="推送"
        severity="reversible"
        side="right"
        align="start"
        onConfirm={() =>
          new Promise<void>((resolve) => {
            setCount((current) => current + 1);
            resolve();
          })
        }
      >
        <Button variant="secondary" size="sm">
          重新推送
        </Button>
      </Popconfirm>
      <span className="text-xs text-(--text-3)">已推送 {count} 次</span>
    </div>
  );
}

export const usage: UsageDoc = {
  when:
    '在列表行内、工具条上做「就地确认」用 Popconfirm：它贴着触发元素弹一个 280 宽的小气泡，不遮挡上下文，用户能一眼看到自己要删的是哪一行。' +
    '同一套三档 severity 在 pro/ConfirmDialog 里也有——区别只在形态与代价：影响面局限在一行、看着当前行就能判断的用气泡；' +
    '要列清单、要展示受影响对象、或者用户必须先读完一段说明的，用居中的 ConfirmDialog。' +
    'reversible 走主色确认钮（可撤销），impact 与 irreversible 走危险色；irreversible 再配 confirmation 强制用户逐字输入名称才解锁。',
  examples: [
    {
      title: '行内删除（impact 档）',
      description:
        'children 必须是单个能接 ref 的元素，会以 asChild 挂到触发器上；气泡默认贴在触发元素下方右对齐。',
      code: `import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popconfirm } from '@/components/pro/Popconfirm';

export function RowDeleteAction({ name, onDelete }: { name: string; onDelete: () => void }) {
  return (
    <Popconfirm
      title="确认删除这条记录？"
      description="删除后仍可在回收站里恢复。"
      cancelText="取消"
      confirmText="删除"
      severity="impact"
      onConfirm={onDelete}
    >
      <Button variant="link" size="sm">
        删除
      </Button>
    </Popconfirm>
  );
}`,
      render: BasicDemo,
    },
    {
      title: '不可逆：输入名称才解锁',
      description:
        'severity="irreversible" 配 confirmation 后气泡里多一个输入框，输入与 expected 逐字相同前确认钮一直置灰。',
      code: `import { Button } from '@/components/ui/button';
import { Popconfirm } from '@/components/pro/Popconfirm';

export function DeleteDeptAction({ onDelete }: { onDelete: () => void }) {
  return (
    <Popconfirm
      title="彻底删除「技术中心」？"
      description="该部门下 48 名成员将一并解除归属，此操作不可撤销。"
      cancelText="取消"
      confirmText="彻底删除"
      severity="irreversible"
      confirmation={{ expected: '技术中心', placeholder: '输入部门名称以确认' }}
      onConfirm={onDelete}
    >
      <Button variant="danger-ghost" size="sm">
        删除部门
      </Button>
    </Popconfirm>
  );
}`,
      render: IrreversibleDemo,
    },
    {
      title: '异步确认',
      description:
        'onConfirm 返回 Promise 时自动进 pending：确认钮转圈、取消钮置灰；resolve 后关闭，reject 保持打开让用户重试。',
      code: `import { Button } from '@/components/ui/button';
import { Popconfirm } from '@/components/pro/Popconfirm';

export function RepushAction({ onRepush }: { onRepush: () => Promise<void> }) {
  return (
    <Popconfirm
      title="重新推送这批面单？"
      cancelText="取消"
      confirmText="推送"
      severity="reversible"
      side="right"
      align="start"
      onConfirm={onRepush}
    >
      <Button variant="secondary" size="sm">
        重新推送
      </Button>
    </Popconfirm>
  );
}`,
      render: AsyncDemo,
    },
  ],
  notes: [
    '与 antd 的差异：没有 okText / cancelText 的默认值，也没有 okType——文案 confirmText / cancelText 必填，按钮色由 severity 决定（reversible 主色、另两档危险色）。',
    'antd 的 Popconfirm 有小三角箭头，本仓画布上所有 popover 一律不带箭头，这里也没有 arrow 相关属性。',
    'onConfirm 返回 Promise 时组件自己管 pending 并在 resolve 后关闭；错误提示归调用方（toast / 表单），reject 时气泡刻意留在原地。',
    '外部已经用 useMutation 管状态时传 pending 即可，它与内部的异步 pending 是「或」的关系，不冲突。',
    'confirmation 只在 severity="irreversible" 时生效；气泡关闭会随 Radix 卸载内容，输入过的确认词不会带到下一个对象上。',
    '需要常显、不带浮层的确认块（状态矩阵、抽屉内联）时直接用导出的 PopconfirmPanel，不要把 Popconfirm 强行 open。',
    '这是体验层的防误触，不是安全边界：真正的删除权限必须由后端校验。',
  ],
};
