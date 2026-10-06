import type { JSX, ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'wait' | 'process' | 'finish' | 'error';

export interface StepItem {
  key: string;
  title: ReactNode;
  description?: ReactNode;
  /** 不传则由 current 推导：之前 finish / 当前 process / 之后 wait */
  status?: StepStatus;
  /** 自定义标记内容，替代序号 / 勾 / 叉（点式下不生效） */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface StepsProps {
  items: StepItem[];
  /** 当前步下标，默认 0 */
  current?: number;
  direction?: 'horizontal' | 'vertical';
  /** md 圈 24 / 标题 13；sm 圈 20 / 标题 12.5 */
  size?: 'sm' | 'md';
  /** 传了才可点：可点时每一步渲染成 button */
  onChange?: (current: number, item: StepItem) => void;
  /** 点式：8px 圆点替代序号圈，当前点带 --pri-soft 外环 */
  progressDot?: boolean;
  className?: string;
  'aria-label'?: string;
}

function resolveStatus(item: StepItem, index: number, current: number): StepStatus {
  if (item.status) return item.status;
  if (index < current) return 'finish';
  if (index === current) return 'process';
  return 'wait';
}

/** 序号圈：四态各自的底 / 边 / 字色，全部走 --steps-marker-* */
const markerToneClass: Record<StepStatus, string> = {
  wait: 'border border-(--steps-marker-border) bg-(--steps-marker-bg) text-(--steps-marker-fg)',
  process: 'bg-(--steps-marker-active-bg) font-medium text-(--steps-marker-active-fg)',
  finish: 'border border-(--steps-marker-done-border) bg-(--surface) text-(--steps-marker-done-fg)',
  error:
    'border border-(--steps-marker-error-fg) bg-(--steps-marker-error-bg) text-(--steps-marker-error-fg)',
};

/** 点式：点色只有「已过 / 当前」橙、「未到」灰、「出错」红三档 */
const dotToneClass: Record<StepStatus, string> = {
  wait: 'bg-(--pro-timeline-marker-border)',
  process: 'bg-(--pro-timeline-marker-active) ring-[length:calc(3px*var(--app-scale))] ring-(--pri-soft)',
  finish: 'bg-(--pro-timeline-marker-active)',
  error: 'bg-(--steps-marker-error-fg)',
};

const titleToneClass: Record<StepStatus, string> = {
  wait: 'font-normal text-(--steps-title-muted-fg)',
  process: 'font-medium text-(--steps-title-fg)',
  finish: 'font-normal text-(--steps-title-fg)',
  error: 'font-medium text-(--steps-marker-error-fg)',
};

function StepMarker({
  status,
  index,
  icon,
  size,
  progressDot,
}: {
  status: StepStatus;
  index: number;
  icon?: ReactNode;
  size: 'sm' | 'md';
  progressDot: boolean;
}): JSX.Element {
  if (progressDot) {
    return (
      <span
        aria-hidden="true"
        data-slot="steps-marker"
        data-status={status}
        className={cn(
          'mt-[calc(6px*var(--app-scale))] size-[calc(8px*var(--app-scale))] shrink-0 rounded-full',
          dotToneClass[status],
        )}
      />
    );
  }

  const iconSizeClass =
    size === 'sm' ? 'size-[calc(10px*var(--app-scale))]' : 'size-[calc(12px*var(--app-scale))]';

  let content: ReactNode = <span className="font-mono">{index + 1}</span>;
  if (icon) content = icon;
  else if (status === 'finish')
    content = <Check aria-hidden="true" strokeWidth={2.2} className={iconSizeClass} />;
  else if (status === 'error') content = <X aria-hidden="true" strokeWidth={2.2} className={iconSizeClass} />;

  return (
    <span
      aria-hidden="true"
      data-slot="steps-marker"
      data-status={status}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        size === 'sm'
          ? 'size-[calc(20px*var(--app-scale))] text-[calc(11px*var(--app-scale))]'
          : 'size-[calc(24px*var(--app-scale))] text-[calc(12px*var(--app-scale))]',
        markerToneClass[status],
      )}
    >
      {content}
    </span>
  );
}

function StepText({
  item,
  status,
  size,
  stacked,
}: {
  item: StepItem;
  status: StepStatus;
  size: 'sm' | 'md';
  stacked: boolean;
}): JSX.Element {
  const title = (
    <span
      data-slot="steps-title"
      className={cn(
        size === 'sm' ? 'text-[calc(12.5px*var(--app-scale))]' : 'text-[calc(13px*var(--app-scale))]',
        titleToneClass[status],
        !stacked && 'whitespace-nowrap',
      )}
    >
      {item.title}
    </span>
  );

  if (!stacked && !item.description) return title;

  return (
    <span data-slot="steps-text" className="flex min-w-0 flex-col gap-[calc(3px*var(--app-scale))] text-left">
      {title}
      {item.description ? (
        <span
          data-slot="steps-description"
          className="text-[calc(12px*var(--app-scale))] text-(--steps-desc-fg)"
        >
          {item.description}
        </span>
      ) : null}
    </span>
  );
}

export function Steps({
  items,
  current = 0,
  direction = 'horizontal',
  size = 'md',
  onChange,
  progressDot = false,
  className,
  'aria-label': ariaLabel,
}: StepsProps): JSX.Element {
  const vertical = direction === 'vertical';
  const interactive = Boolean(onChange);
  const markerColumnClass =
    size === 'sm' ? 'w-[calc(20px*var(--app-scale))]' : 'w-[calc(24px*var(--app-scale))]';

  return (
    <ol
      data-slot="steps"
      data-direction={direction}
      data-size={size}
      aria-label={ariaLabel}
      className={cn(vertical ? 'flex flex-col' : 'flex items-center', className)}
    >
      {items.map((item, index) => {
        const status = resolveStatus(item, index, current);
        const last = index === items.length - 1;
        const lineClass = status === 'finish' ? 'bg-(--steps-line-done)' : 'bg-(--steps-line)';
        const marker = (
          <StepMarker status={status} index={index} icon={item.icon} size={size} progressDot={progressDot} />
        );
        const text = <StepText item={item} status={status} size={size} stacked={vertical} />;

        // 可点时整步渲染成 button（含纵向的标记列，竖线随行高伸展要留在同一 flex 容器里）
        const bodyClass = vertical
          ? 'flex w-full gap-[calc(10px*var(--app-scale))] text-left'
          : 'flex items-center gap-[calc(8px*var(--app-scale))]';
        const focusClass = interactive
          ? 'cursor-pointer rounded-sm outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring) disabled:cursor-not-allowed disabled:opacity-45'
          : '';

        const body = vertical ? (
          <>
            <span
              data-slot="steps-marker-column"
              className={cn('flex shrink-0 flex-col items-center', markerColumnClass)}
            >
              {marker}
              {!last && (
                <span
                  aria-hidden="true"
                  data-slot="steps-line"
                  className={cn('my-[calc(4px*var(--app-scale))] w-px grow', lineClass)}
                />
              )}
            </span>
            <span
              className={cn(
                'flex min-w-0 flex-col',
                progressDot ? 'pt-[calc(7px*var(--app-scale))]' : 'pt-[calc(3px*var(--app-scale))]',
              )}
            >
              {text}
            </span>
          </>
        ) : (
          <>
            {marker}
            {text}
          </>
        );

        return (
          <li
            key={item.key}
            data-slot="steps-item"
            data-status={status}
            aria-current={status === 'process' ? 'step' : undefined}
            className={cn(
              vertical
                ? cn(
                    'flex',
                    last ? 'min-h-[calc(44px*var(--app-scale))]' : 'min-h-[calc(58px*var(--app-scale))]',
                  )
                : cn('flex items-center gap-[calc(8px*var(--app-scale))]', !last && 'grow'),
            )}
          >
            {interactive ? (
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => onChange?.(index, item)}
                className={cn(bodyClass, focusClass)}
              >
                {body}
              </button>
            ) : (
              <span className={bodyClass}>{body}</span>
            )}
            {!vertical && !last && (
              <span
                aria-hidden="true"
                data-slot="steps-line"
                className={cn('mx-[calc(10px*var(--app-scale))] h-px grow', lineClass)}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
