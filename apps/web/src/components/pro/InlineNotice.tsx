import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const noticeVariants = cva(
  'rounded-6 px-[calc(12px*var(--app-scale))] py-[calc(10px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))] leading-[1.55]',
  {
    variants: {
      tone: {
        warning: 'bg-(--feedback-warning-bg) text-(--feedback-warning-fg)',
        danger: 'bg-(--feedback-danger-bg) text-(--feedback-danger-fg)',
      },
    },
    defaultVariants: { tone: 'warning' },
  },
);

/** 弹窗 / 表单内的后果提示：整块淡底、自动换行，不带边框和阴影。 */
export function InlineNotice({
  tone,
  children,
  className,
}: VariantProps<typeof noticeVariants> & { children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="inline-notice"
      data-tone={tone ?? 'warning'}
      role="status"
      className={cn(noticeVariants({ tone }), className)}
    >
      {children}
    </div>
  );
}
