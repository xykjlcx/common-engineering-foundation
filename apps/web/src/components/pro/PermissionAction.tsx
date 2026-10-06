import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// 破坏性与高价值操作（删除 / 审核 / 过账 / 导出全量）用 disable 并说明缺哪个权限点，
// 普通操作用 hide——满屏灰按钮会变成噪声，只对值得申请的操作留痕。
// 前端权限不是安全边界，这里只防误触；真正的拦截在后端。
export type PermissionActionDegrade = 'hide' | 'disable';

export interface PermissionActionProps {
  allowed: boolean;
  degrade: PermissionActionDegrade;
  // 置灰态的悬浮说明，例如「需要 sys:user:delete，你的角色不包含」；文案由调用方注入
  reason?: ReactNode;
  children: ReactElement<{ disabled?: boolean }>;
  className?: string;
}

export function PermissionAction({ allowed, degrade, reason, children, className }: PermissionActionProps) {
  if (allowed) return children;
  if (degrade === 'hide') return null;

  const disabledTrigger = cloneElement(children, { disabled: true });

  if (!reason) return disabledTrigger;

  return (
    <Tooltip>
      {/* 置灰按钮不派发指针事件，tooltip 必须挂在外层可聚焦容器上才触发得了 */}
      <TooltipTrigger asChild>
        <span
          data-slot="permission-action"
          data-degrade={degrade}
          tabIndex={0}
          className={cn('inline-flex', className)}
        >
          {disabledTrigger}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
