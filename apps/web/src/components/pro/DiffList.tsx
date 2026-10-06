import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DiffListItem {
  key: string;
  label: ReactNode;
  /** 原值；null = 原来为空，只展示新值并标「新增」 */
  from: ReactNode | null;
  /** 新值；null = 被清空，展示划掉的原值并标「已清除」 */
  to: ReactNode | null;
}

export interface DiffListLabels {
  added: string;
  cleared: string;
}

/** 提交前的字段变更清单：每项上行字段名，下行「原值（划线）→ 新值」；纯新增 / 纯清除各用一个小标记，不画「— →」。 */
export function DiffList({
  items,
  labels,
  empty,
  className,
}: {
  items: readonly DiffListItem[];
  labels: DiffListLabels;
  empty?: ReactNode;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <p data-slot="diff-list-empty" className="py-5 text-center text-xs text-text-3">
        {empty}
      </p>
    );
  }
  return (
    <ul data-slot="diff-list" className={cn('m-0 list-none p-0', className)}>
      {items.map((item) => {
        const added = item.from === null;
        const cleared = item.to === null;
        return (
          <li
            key={item.key}
            data-slot="diff-list-item"
            data-kind={added ? 'added' : cleared ? 'cleared' : 'changed'}
            className="grid gap-[calc(3px*var(--app-scale))] border-b border-(--page-section-divider) px-[calc(14px*var(--app-scale))] py-[calc(9px*var(--app-scale))] last:border-b-0"
          >
            <div className="flex items-center gap-[calc(6px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-text-3">
              <span>{item.label}</span>
              {(added || cleared) && (
                <span
                  data-slot="diff-list-tag"
                  className={cn(
                    'rounded-4 px-[calc(5px*var(--app-scale))] text-[calc(10.5px*var(--app-scale))]',
                    added
                      ? 'bg-(--feedback-success-bg) text-(--feedback-success-fg)'
                      : 'bg-(--feedback-warning-bg) text-(--feedback-warning-fg)',
                  )}
                >
                  {added ? labels.added : labels.cleared}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-[calc(6px*var(--app-scale))] text-[calc(13px*var(--app-scale))] break-words">
              {!added && (
                <span
                  data-slot="diff-list-from"
                  className={cn('text-text-3', !cleared && 'line-through decoration-(--text-3)/60')}
                >
                  {item.from}
                </span>
              )}
              {!added && !cleared && (
                <span aria-hidden="true" className="text-text-3">
                  →
                </span>
              )}
              {!cleared && (
                <span data-slot="diff-list-to" className="font-medium text-text">
                  {item.to}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
