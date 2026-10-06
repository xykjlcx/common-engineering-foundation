import type { JSX } from 'react';
import { cn } from '@/lib/utils';

const segmentCount = 20;

export interface SegmentedProgressProps {
  value: number;
  max: number;
  /** 右侧 mono 文本，如「12 / 15」。由外部拼好传入（pro 层不做 i18n / 数字格式化） */
  label?: string;
  'aria-label': string;
  className?: string;
}

export function SegmentedProgress({
  value,
  max,
  label,
  className,
  'aria-label': ariaLabel,
}: SegmentedProgressProps): JSX.Element {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const filled = Math.round(ratio * segmentCount);

  return (
    <span
      data-slot="segmented-progress"
      className={cn('inline-flex items-center gap-[calc(9px*var(--app-scale))]', className)}
    >
      <span
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        data-slot="segmented-progress-track"
        data-filled={filled}
        className="inline-flex items-center gap-[calc(2px*var(--app-scale))]"
      >
        {Array.from({ length: segmentCount }).map((_, index) => (
          <span
            key={index}
            aria-hidden="true"
            data-slot="segmented-progress-segment"
            data-on={index < filled || undefined}
            className={cn(
              'inline-block h-[calc(11px*var(--app-scale))] w-[calc(3px*var(--app-scale))] rounded-(--radius-xs)',
              index < filled ? 'bg-(--pri)' : 'bg-(--progress-segment-off)',
            )}
          />
        ))}
      </span>
      {label && (
        <span
          data-slot="segmented-progress-label"
          className="font-mono text-[calc(12.5px*var(--app-scale))] text-(--type-2-fg)"
        >
          {label}
        </span>
      )}
    </span>
  );
}
