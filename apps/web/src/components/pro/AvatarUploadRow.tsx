import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** 头像字段的紧凑行：预览 + 动作 + 单行提示，高度与同排输入框一致；失败文案仅在出错时另起一行。板：UM09 / UM16 ④。 */
export function AvatarUploadRow({
  preview,
  actions,
  hint,
  error,
  className,
}: {
  preview: ReactNode;
  actions: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="avatar-upload-row"
      data-invalid={error ? true : undefined}
      className={cn('grid gap-1.5', className)}
    >
      <div className="flex min-h-(--control-md) min-w-0 items-center gap-[calc(10px*var(--app-scale))]">
        <div className="shrink-0">{preview}</div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
        {hint ? (
          <span
            className="min-w-0 truncate text-xs text-text-3"
            title={typeof hint === 'string' ? hint : undefined}
          >
            {hint}
          </span>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="m-0 text-[calc(12.5px*var(--app-scale))] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
