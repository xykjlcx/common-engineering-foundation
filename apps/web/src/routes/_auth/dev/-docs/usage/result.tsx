import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Result } from '@/components/pro/Result';
import type { UsageDoc } from '../types';

/* 结果页「用法」文档。demo 全部业务无关、自持状态，文案用中文字面量（dev-only，不进 i18n）。 */

function SemanticDemo() {
  const [done, setDone] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <Result
        status={done ? 'success' : 'warning'}
        title={done ? '导入完成' : '导入已取消'}
        description={done ? '共 248 条记录已写入，其中 3 条被跳过。' : '本次没有写入任何数据。'}
        extra={
          <>
            <Button size="sm" onClick={() => setDone(!done)}>
              切换结果
            </Button>
            <Button size="sm" variant="secondary">
              返回列表
            </Button>
          </>
        }
      />
    </div>
  );
}

function CodeDemo() {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <Result
        status="404"
        title="页面不存在"
        description="地址可能已经变更，或者你没有访问它的权限。"
        extra={<Button size="sm">回到首页</Button>}
      />
      <Result
        status="403"
        title="没有访问权限"
        description="请联系管理员为你的角色添加该菜单。"
        extra={
          <Button size="sm" variant="secondary">
            申请权限
          </Button>
        }
      />
    </div>
  );
}

function CompactDemo() {
  return (
    <Result
      compact
      status="error"
      title="3 条记录导入失败"
      description="其余 245 条已成功写入，可修正后重新导入这 3 条。"
      extra={
        <Button size="sm" variant="secondary">
          下载错误明细
        </Button>
      }
    >
      <ul className="flex flex-col gap-1 p-3 text-xs text-(--type-2-fg)">
        <li>第 12 行：工号 EMP-0059 已存在</li>
        <li>第 34 行：部门「云仓优选」不存在</li>
        <li>第 87 行：手机号格式不正确</li>
      </ul>
    </Result>
  );
}

export const usage: UsageDoc = {
  when:
    '一整块区域（整页、弹窗内、抽屉内）只剩「一个结论 + 一两个后续动作」时用 Result：提交成功、批量操作完成、403 / 404 / 500。' +
    '它是终态展示，不是提示：一次性、不打断流程的反馈用 toast，页面顶部持续存在的告警用 pro/InterruptBanner。' +
    '「查询结果为空」不是 Result 的活，那是 ui/Empty；pro/ErrorScreen 已经改成本件的三个错误码子集，路由级错误直接用它即可。' +
    '嵌在弹窗或侧栏里时加 compact，把圆标从 48 收到 36。',
  examples: [
    {
      title: '四语义结果 + 动作',
      description:
        'status 的 success / info / warning / error 四档各配一个软底圆标；extra 放 1~2 个 Button size="sm"。',
      code: `import { Button } from '@/components/ui/button';
import { Result } from '@/components/pro/Result';

export function ImportDone() {
  return (
    <Result
      status="success"
      title="导入完成"
      description="共 248 条记录已写入，其中 3 条被跳过。"
      extra={
        <>
          <Button size="sm">查看结果</Button>
          <Button size="sm" variant="secondary">
            返回列表
          </Button>
        </>
      }
    />
  );
}`,
      render: SemanticDemo,
    },
    {
      title: '错误码页',
      description: '403 / 404 / 500 不画语义圆，改成一枚大号 mono 灰码；这就是 ErrorScreen 内部用的形态。',
      code: `import { Button } from '@/components/ui/button';
import { Result } from '@/components/pro/Result';

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="页面不存在"
      description="地址可能已经变更，或者你没有访问它的权限。"
      extra={<Button size="sm">回到首页</Button>}
    />
  );
}`,
      render: CodeDemo,
    },
    {
      title: 'compact + 明细块',
      description:
        'children 渲染在动作行下方，是一块 380 宽、左对齐、带边框的补充区，用来放失败清单一类的明细。',
      code: `import { Button } from '@/components/ui/button';
import { Result } from '@/components/pro/Result';

export function ImportPartialFailure() {
  return (
    <Result
      compact
      status="error"
      title="3 条记录导入失败"
      description="其余 245 条已成功写入，可修正后重新导入这 3 条。"
      extra={
        <Button size="sm" variant="secondary">
          下载错误明细
        </Button>
      }
    >
      <ul className="flex flex-col gap-1 p-3 text-xs text-(--type-2-fg)">
        <li>第 12 行：工号 EMP-0059 已存在</li>
        <li>第 34 行：部门「云仓优选」不存在</li>
        <li>第 87 行：手机号格式不正确</li>
      </ul>
    </Result>
  );
}`,
      render: CompactDemo,
    },
  ],
  notes: [
    '与 antd 的差异：副标题属性叫 description 不叫 subTitle；status 的取值多了 info，少了 antd 的 "warning" 之外的自定义 icon 入口（不支持传 icon）。',
    'antd 的 Result 默认带很厚的内边距与超大图标，这里按板值收成 48 圆 / 28 图标（compact 档 36 / 22），不要再用 className 撑大。',
    'children 在 antd 里是「结果详情区」，本仓语义相同，但已经预设成 380 宽的带框块；要整宽请自己包一层并覆盖宽度类。',
    '不绑路由：extra 里的按钮要跳转请自己用 Link 包（asChild），Result 本身不知道路由的存在。',
    'ErrorScreen 是 Result 的封装（403 / 404 / 500 三码），新代码优先用 ErrorScreen 接路由错误边界，别再抄一遍 Result。',
  ],
};
