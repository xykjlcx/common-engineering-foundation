import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// 会话过期 / 断网 / 重连成功一律走这里，不弹整页错误页——整页会丢掉用户已填的表单内容。
// 三种通条共用同一位置（内容区顶部），同时只显示一条。
export type InterruptTone = 'warning' | 'danger' | 'success';

const interruptBannerVariants = cva(
  'flex h-[calc(36px*var(--app-scale))] items-center gap-[calc(9px*var(--app-scale))] rounded-md border px-3 text-[calc(12.5px*var(--app-scale))]',
  {
    variants: {
      tone: {
        // 会话过期
        warning: 'border-(--feedback-warning-border) bg-(--feedback-warning-bg) text-(--feedback-warning-fg)',
        // 断网 / 重连中
        danger: 'border-(--feedback-danger-border) bg-(--feedback-danger-bg) text-(--feedback-danger-fg)',
        // 已恢复，已填内容都还在
        success: 'border-(--feedback-success-border) bg-(--feedback-success-bg) text-(--feedback-success-fg)',
      },
    },
    defaultVariants: { tone: 'warning' },
  },
);

export interface InterruptBannerProps extends VariantProps<typeof interruptBannerVariants> {
  tone: InterruptTone;
  message: ReactNode;
  // 动作位：「去登录」「立即重试」「继续」
  action?: {
    label: ReactNode;
    onClick: () => void;
  };
  className?: string;
}

export function InterruptBanner({ tone, message, action, className }: InterruptBannerProps) {
  return (
    <div
      data-slot="interrupt-banner"
      data-tone={tone}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(interruptBannerVariants({ tone }), className)}
    >
      <span className="min-w-0 flex-1 truncate">{message}</span>
      {action && (
        <button
          type="button"
          className={cn(
            'shrink-0 cursor-pointer bg-transparent text-xs text-current outline-none hover:underline',

            tone !== 'success' && 'font-medium',
          )}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
