import { useState, type JSX, type ReactNode } from 'react';
import { DescriptionList, type DescriptionListItem } from '@/components/pro/DescriptionList';

// 键值行状态矩阵（DescriptionList：field 就地编辑五态 / compact / 侧栏 compact 就地编辑）。
// 说明：这是 dev-only 状态矩阵，示例文案直接取自原型板（DSAdditions 4.10 与 UserDetail）的板上原文，
// 作为夹具数据不进 i18n 资源；组件本身的文案全部由 editLabels 注入。

const editLabels = {
  edit: '编辑',
  save: '保存',
  cancel: '取消',
  saving: '保存中',
  saved: '已保存',
};

/** 板 4.10 的格子外壳（testid 前缀沿用旧 editable 矩阵，守卫与视觉验收都按它定位） */
function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`editable.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

/** UserDetail 板的格子外壳（testid 前缀沿用旧 row-menu-picker 矩阵） */
function RowMenuCell({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div data-testid={`rowMenuPicker.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

/** 板 4.10 字段五态：默认 / hover 出铅笔 / 编辑 / 保存中 / 已保存 + 只读字段不出铅笔 */
function EditableFields(): JSX.Element {
  const [profile, setProfile] = useState({
    name: '林小雨',
    phone: '138 **** 2201',
    email: 'lin.xy@keel.dev',
    location: '深圳 · 南山',
    joinedAt: '2024-03-18',
  });

  const field = (
    key: keyof typeof profile,
    label: string,
    options: { mono?: boolean; delay?: number } = {},
  ): DescriptionListItem => ({
    label,
    value: profile[key],
    ...(options.mono ? { mono: true } : {}),
    editable: {
      value: profile[key],
      onSave: async (next) => {
        if (options.delay) {
          await new Promise((resolve) => setTimeout(resolve, options.delay));
        }
        setProfile((prev) => ({ ...prev, [key]: next }));
      },
    },
  });

  return (
    <DescriptionList
      size="field"
      editLabels={editLabels}
      items={[
        field('name', '姓名'),
        field('phone', '手机号', { mono: true }),
        field('email', '邮箱', { mono: true }),
        // 板：工作地点这一格演示「保存中」——真实网络往返用延时夹具模拟
        field('location', '工作地点', { delay: 900 }),
        field('joinedAt', '入职日期', { mono: true }),
        {
          label: '工号',
          value: 'EMP-0231',
          mono: true,
          editable: { value: 'EMP-0231', onSave: () => undefined, readOnly: true },
        },
      ]}
    />
  );
}

export default function DescriptionListMatrix(): JSX.Element {
  return (
    <section
      data-testid="descriptionListMatrix"
      className="mt-8 rounded-md border border-border bg-surface-2 p-4"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">键值行状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">
          DescriptionList（size=field 就地编辑五态 / size=compact 26px / 侧栏 compact 就地编辑）
        </p>
      </div>

      <div className="grid gap-6">
        <Cell id="DescriptionList.editable" title="详情就地编辑：五态可点（工号只读不出铅笔）">
          <EditableFields />
        </Cell>

        <Cell id="DescriptionList.editableCompact" title="就地编辑挂在侧栏 compact 形态上">
          <DescriptionList
            size="compact"
            divided
            editLabels={editLabels}
            items={[
              { label: '部门', value: '财务部 · 总账组' },
              {
                label: '直属上级',
                value: '周敏',
                editable: { value: '周敏', onSave: () => undefined },
              },
              {
                label: '员工编号',
                value: 'EMP-0231',
                mono: true,
                editable: { value: 'EMP-0231', onSave: () => undefined, readOnly: true },
              },
            ]}
          />
        </Cell>

        <RowMenuCell id="DescriptionList.compact" title="键值行：size=compact（26px）">
          <DescriptionList
            size="compact"
            items={[
              { label: '部门', value: '财务部 · 总账组' },
              { label: '岗位', value: '会计主管' },
              { label: '手机', value: '138****5120', mono: true },
              { label: '入职日期', value: '2024-03-11', mono: true },
            ]}
          />
        </RowMenuCell>
      </div>
    </section>
  );
}
