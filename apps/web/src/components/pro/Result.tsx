import type { JSX, ReactNode } from 'react';
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ResultStatus = 'success' | 'info' | 'warning' | 'error' | '403' | '404' | '500';

export interface ResultProps {
  status: ResultStatus;
  title: ReactNode;
  description?: ReactNode;
  /** 动作行：一般传 1~2 个 Button size="sm" */
  extra?: ReactNode;
  /** 动作行下的补充块，如失败明细清单 */
  children?: ReactNode;
  /** 弹窗 / 侧栏档：36 圆 + 13.5 标题 */
  compact?: boolean;
  className?: string;
}

const semanticIcon = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
} as const;

/** 软底圆的底色 + 图标本色，一一对应语义五组里的四组 */
const semanticToneClass = {
  success: 'bg-(--success-soft) text-(--success)',
  info: 'bg-(--info-soft) text-(--info)',
  warning: 'bg-(--warning-soft) text-(--warning)',
  error: 'bg-(--danger-soft) text-(--danger)',
} as const;

function isSemantic(status: ResultStatus): status is keyof typeof semanticIcon {
  return status in semanticIcon;
}

export function Result({
  status,
  title,
  description,
  extra,
  children,
  compact = false,
  className,
}: ResultProps): JSX.Element {
  const semantic = isSemantic(status);
  const Icon = semantic ? semanticIcon[status] : null;

  return (
    <div
      data-slot="result"
      data-status={status}
      className={cn(
        'flex flex-col items-center justify-center p-[calc(20px*var(--app-scale))] text-center',
        className,
      )}
    >
      {Icon ? (
        <span
          data-slot="result-icon"
          className={cn(
            'inline-flex items-center justify-center rounded-full',
            compact ? 'size-[calc(36px*var(--app-scale))]' : 'size-[calc(48px*var(--app-scale))]',
            semantic ? semanticToneClass[status] : undefined,
          )}
        >
          <Icon
            aria-hidden="true"
            strokeWidth={1.8}
            className={compact ? 'size-[calc(22px*var(--app-scale))]' : 'size-[calc(28px*var(--app-scale))]'}
          />
        </span>
      ) : (
        <span
          data-slot="result-code"
          className="font-mono text-[calc(34px*var(--app-scale))] font-semibold tracking-[0.02em] text-(--error-code-fg)"
        >
          {status}
        </span>
      )}

      <p
        data-slot="result-title"
        className={cn(
          'font-semibold text-(--text)',
          compact
            ? 'mt-[calc(8px*var(--app-scale))] text-[calc(13.5px*var(--app-scale))]'
            : 'mt-[calc(12px*var(--app-scale))] text-[calc(15px*var(--app-scale))]',
        )}
      >
        {title}
      </p>

      {description ? (
        <p
          data-slot="result-description"
          className="mt-[calc(5px*var(--app-scale))] max-w-[calc(380px*var(--app-scale))] text-[calc(12px*var(--app-scale))] leading-[1.6] text-(--empty-fg)"
        >
          {description}
        </p>
      ) : null}

      {extra ? (
        <div
          data-slot="result-extra"
          className="mt-[calc(14px*var(--app-scale))] inline-flex items-center gap-[calc(8px*var(--app-scale))]"
        >
          {extra}
        </div>
      ) : null}

      {children ? (
        <div
          data-slot="result-content"
          className="mt-[calc(14px*var(--app-scale))] w-[calc(380px*var(--app-scale))] max-w-full overflow-hidden rounded-md border border-(--border) bg-(--surface-2) text-left"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
