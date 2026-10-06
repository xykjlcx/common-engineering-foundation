import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** 表格单元格的排印与语义色；禁用行的弱化色优先于单元格语气。 */
export function TableText({
  tone = 'body',
  muted = false,
  mono = false,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'strong' | 'link' | 'body' | 'weak' | 'hint' | 'success' | 'danger';
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <span
      data-slot="table-text"
      data-tone={tone}
      data-muted={muted || undefined}
      data-mono={mono || undefined}
      className={cn(
        'block min-w-0 truncate',
        (tone === 'strong' || tone === 'link') && !muted && 'font-medium',
        tone === 'hint' && 'text-[calc(11.5px*var(--app-scale))]',
        tone === 'weak' && 'text-[calc(12.5px*var(--app-scale))]',
        mono && 'font-mono text-[calc(12.5px*var(--app-scale))]',
        muted
          ? 'text-(--table-row-fg-muted)'
          : {
              strong: 'text-(--table-row-fg)',
              link: 'text-(--table-action-fg)',
              body: 'text-(--table-cell-secondary-fg)',
              weak: 'text-(--table-header-fg)',
              hint: 'text-(--table-cell-hint-fg)',
              success: 'text-(--table-cell-success-fg)',
              danger: 'text-(--table-cell-danger-fg)',
            }[tone],
        className,
      )}
      {...props}
    />
  );
}
