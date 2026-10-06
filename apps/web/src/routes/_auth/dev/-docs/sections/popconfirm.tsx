import { useState, type JSX, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popconfirm, PopconfirmPanel } from '@/components/pro/Popconfirm';

// Popconfirm 状态矩阵（板 DSAdditions.dc.html 4.6「气泡确认」两行）。
// 说明：这是 dev-only 状态矩阵，示例文案直接取自原型板的板上原文，作为夹具数据不进 i18n 资源；
// 组件本身的文案（确认钮 / 取消钮 / 占位符）全部由 props 注入。

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`numberPopconfirm.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

/** 模拟角色列表的一行（板 4.6「锚定位置」：行尾删除图标 + 右对齐气泡） */
function FakeRow({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="ui-table-row group/row flex h-[calc(32px*var(--app-scale))] items-center gap-3 px-(--table-cell-px) text-[calc(13px*var(--app-scale))]">
      {children}
    </div>
  );
}

export default function PopconfirmMatrix(): JSX.Element {
  const [deleted, setDeleted] = useState(false);

  return (
    <section data-testid="popconfirmMatrix" className="mt-8 rounded-md border border-border bg-surface-2 p-4">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">气泡确认状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">Popconfirm 三档 severity / pending / 行内锚定 / 禁用</p>
      </div>

      <div className="grid gap-6">
        {/* —— 板 4.6 第一行：三档 severity（常显气泡体，不必逐个点开） —— */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Cell id="Popconfirm.reversible" title="可撤销：Info 图标 + 主色钮">
            <PopconfirmPanel
              severity="reversible"
              title="离开当前页面？"
              description="未保存的修改会丢失，可以回来重新填写。"
              cancelText="留在本页"
              confirmText="离开"
              onCancel={() => undefined}
              onConfirm={() => undefined}
            />
          </Cell>

          <Cell id="Popconfirm.impact" title="有影响面：warning 图标 + 后果写进按钮文案">
            <PopconfirmPanel
              severity="impact"
              title="停用「林小雨」？"
              description="停用后其名下 12 张待审凭证将转交部门主管，本人下次登录即被拦截。"
              cancelText="取消"
              confirmText="停用并转交"
              onCancel={() => undefined}
              onConfirm={() => undefined}
            />
          </Cell>

          <Cell id="Popconfirm.irreversible" title="不可逆：输入名称前确认钮置灰">
            <PopconfirmPanel
              severity="irreversible"
              title="删除角色「财务审核员」？"
              description="该角色下 3 名成员将失去全部对应权限，且不可恢复。"
              cancelText="取消"
              confirmText="删除"
              confirmation={{ expected: '财务审核员', placeholder: '输入 财务审核员 以确认' }}
              onCancel={() => undefined}
              onConfirm={() => undefined}
            />
          </Cell>

          <Cell id="Popconfirm.pending" title="pending：确认钮转圈、取消钮禁用">
            <PopconfirmPanel
              severity="impact"
              title="停用「林小雨」？"
              description="正在提交，两个钮都锁住。"
              cancelText="取消"
              confirmText="停用并转交"
              pending
              onCancel={() => undefined}
              onConfirm={() => undefined}
            />
          </Cell>
        </div>

        {/* —— 板 4.6 第二行：锚定位置（真实触发版） —— */}
        <div className="grid gap-4 md:grid-cols-2">
          <Cell id="Popconfirm.anchored" title="行尾删除图标触发：右对齐 / 顶部距行 4px">
            <FakeRow>
              <span className="w-[calc(80px*var(--app-scale))] font-mono text-[calc(12.5px*var(--app-scale))] text-(--text-3)">
                R-0007
              </span>
              <span className="flex-1 text-(--text)">{deleted ? '财务审核员（已删除）' : '财务审核员'}</span>
              <span className="w-[calc(60px*var(--app-scale))] text-(--type-2-fg)">3 人</span>
              <Popconfirm
                severity="impact"
                title="删除「财务审核员」？"
                description="3 名成员将失去对应权限。"
                cancelText="取消"
                confirmText="删除"
                onConfirm={() => setDeleted(true)}
              >
                <Button variant="ghost" size="icon-xs" aria-label="删除角色">
                  <Trash2 data-icon aria-hidden="true" />
                </Button>
              </Popconfirm>
            </FakeRow>
          </Cell>

          <Cell id="Popconfirm.disabled" title="禁用：点触发器不再打开气泡">
            <FakeRow>
              <span className="flex-1 text-(--text)">内置角色不可删</span>
              <Popconfirm
                severity="irreversible"
                title="删除「系统管理员」？"
                description="内置角色不可删除。"
                cancelText="取消"
                confirmText="删除"
                disabled
                onConfirm={() => undefined}
              >
                <Button variant="ghost" size="icon-xs" aria-label="删除内置角色">
                  <Trash2 data-icon aria-hidden="true" />
                </Button>
              </Popconfirm>
            </FakeRow>
          </Cell>
        </div>
      </div>
    </section>
  );
}
