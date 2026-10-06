import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormErrorSummaryItem {
  // 目标控件的 DOM id：点击摘要项时滚动并聚焦到它
  fieldId: string;

  group?: ReactNode;
  label: ReactNode;
  message: ReactNode;
}

export interface FormErrorSummaryProps {
  // 「有 3 项需要修正后才能提交」——数量由调用方带进文案，pro 层不做 i18n 复数
  title: ReactNode;
  items: FormErrorSummaryItem[];
  // 不传则默认聚焦 fieldId 对应控件
  onSelect?: (item: FormErrorSummaryItem) => void;
  className?: string;
}

function focusField(fieldId: string) {
  const target = document.getElementById(fieldId);
  if (!target) return;
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  target.focus({ preventScroll: true });
}

// 提交失败摘要（FormFeedback.dc.html 表单级格）：长表单提交失败时顶部汇总，
// 每一条可点击直接跳到对应字段并聚焦——否则用户要在几屏字段里自己找红框。
export function FormErrorSummary({ title, items, onSelect, className }: FormErrorSummaryProps) {
  if (items.length === 0) return null;

  return (
    <div
      data-slot="form-error-summary"
      role="alert"
      className={cn(
        'flex items-start gap-[calc(9px*var(--app-scale))] rounded-md border border-(--feedback-danger-border) bg-(--feedback-danger-bg) px-3 py-2.5 text-(--feedback-danger-fg)',
        className,
      )}
    >
      <CircleAlert
        aria-hidden="true"
        strokeWidth={2}
        className="mt-px size-[calc(14px*var(--app-scale))] shrink-0"
      />
      <div className="min-w-0">
        <div className="text-[calc(12.5px*var(--app-scale))] font-medium">{title}</div>
        <ul className="mt-[calc(7px*var(--app-scale))] flex flex-col gap-[calc(3px*var(--app-scale))]">
          {items.map((item) => (
            <li key={item.fieldId}>
              <button
                type="button"
                className="cursor-pointer bg-transparent text-left text-xs text-current outline-none hover:underline"
                onClick={() => (onSelect ? onSelect(item) : focusField(item.fieldId))}
              >
                {'· '}
                {item.group && <>{item.group} / </>}
                {item.label} —— {item.message}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
