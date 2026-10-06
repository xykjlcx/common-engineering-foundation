import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlert, CircleCheck, RotateCcw } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

import { cn } from '@/lib/utils';

// 撤销型用深色底与普通反馈区分——批量破坏性操作给「撤销」而不是二次确认。
export type ToastTone = 'success' | 'error' | 'warning' | 'undo';

const toastSurfaceVariants = cva(
  'flex h-[calc(40px*var(--app-scale))] items-center gap-[calc(9px*var(--app-scale))] rounded-lg border px-3 text-[calc(12.5px*var(--app-scale))]',
  {
    variants: {
      tone: {
        success:
          'border-(--feedback-success-border) bg-(--feedback-success-bg) text-(--feedback-success-fg) shadow-(--shadow-toast)',
        error:
          'border-(--feedback-danger-border) bg-(--feedback-danger-bg) text-(--feedback-danger-fg) shadow-(--shadow-toast)',
        warning:
          'border-(--feedback-warning-border) bg-(--feedback-warning-bg) text-(--feedback-warning-fg) shadow-(--shadow-toast)',
        // 深色撤销条不随明暗反转，与 tooltip 同一恒深表面
        undo: 'border-transparent bg-(--toast-undo-bg) text-(--toast-undo-fg) shadow-(--shadow-toast-undo)',
      },
    },
    defaultVariants: { tone: 'success' },
  },
);

const toastIcons: Record<ToastTone, typeof CircleAlert> = {
  success: CircleCheck,
  error: CircleAlert,
  warning: CircleAlert,
  undo: RotateCcw,
};

export interface ToastSurfaceProps extends VariantProps<typeof toastSurfaceVariants> {
  tone: ToastTone;
  message: ReactNode;
  // 动作位：「查看详情」「查看」「撤销」——文字按钮，吃当前 tone 的前景色
  action?: ReactNode;
  className?: string;
}

// 纯展示层：组件站 /dev/components/toast 直接渲染它做状态矩阵，运行时由 notify() 交给 sonner
export function ToastSurface({ tone, message, action, className }: ToastSurfaceProps) {
  const Icon = toastIcons[tone];

  return (
    <div data-slot="toast-surface" data-tone={tone} className={cn(toastSurfaceVariants({ tone }), className)}>
      <Icon aria-hidden="true" strokeWidth={2} className="size-[calc(14px*var(--app-scale))] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{message}</span>
      {action}
    </div>
  );
}

export interface ToastActionSpec {
  label: ReactNode;
  onClick: () => void;
}

export interface NotifyOptions {
  tone: ToastTone;
  message: ReactNode;
  action?: ToastActionSpec;
  duration?: number;
}

// 其余一律不自动消失，必须由用户关闭——一闪而过的错误等于没提示。
// 位置与堆叠上限（内容区顶部居中、最多 3 条）由 app/providers 的 Toaster 装配决定。
const SUCCESS_DURATION_MS = 3000;

export function notify({ tone, message, action, duration }: NotifyOptions) {
  return sonnerToast.custom(
    (id) => (
      <ToastSurface
        tone={tone}
        message={message}
        action={
          action && (
            <button
              type="button"
              className="shrink-0 cursor-pointer bg-transparent text-xs font-medium text-current outline-none hover:underline"
              onClick={() => {
                action.onClick();
                sonnerToast.dismiss(id);
              }}
            >
              {action.label}
            </button>
          )
        }
      />
    ),
    { duration: duration ?? (tone === 'success' ? SUCCESS_DURATION_MS : Infinity) },
  );
}
