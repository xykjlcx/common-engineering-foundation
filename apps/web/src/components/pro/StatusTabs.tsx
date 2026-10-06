/**
 * StatusTabs —— 列表页工具区第四层：状态药丸 tab（带 mono 计数）。
 *
 * 板：design-explore/pipeline-board/UserList.dc.html L108-113 与 FilterBuilder.dc.html L126-132。逐值出处：
 *   · 行容器   display:flex; align-items:center; gap:3px（外层 margin-top:10 / padding-bottom:10 由 ListChrome 负责）
 *   · tab      height:28px; gap:6px; padding:0 11px; border-radius:4px; font-size:13px
 *   · 选中     background:#f2f2f0; font-weight:600; color:#2e2e2c
 *              计数 <span class="mono" style="font-weight:500; color:#8f8f8c">
 *   · 未选中   color:#636361；计数 <span class="mono" style="color:#9a9a97">
 *
 * 落 token：28 = --control-sm；4px 圆角 = rounded-md（pipeline --radius-factor .5）；
 * 药丸配色复用 --tabs-seg-*（tokens.pipeline.css 里已是板值 #f2f2f0 / #2e2e2c / #636361），
 * 计数走本切片新增的 --tabs-seg-count-fg / --tabs-seg-count-fg-active。
 *
 * pro 组件纪律：不 useTranslation、不 import @/modules/**，文案全部经 props 注入。
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StatusTabItem<TValue extends string = string> {
  value: TValue;
  label: ReactNode;
  count?: ReactNode;
  disabled?: boolean;
}

export interface StatusTabsProps<TValue extends string = string> {
  items: StatusTabItem<TValue>[];
  value: TValue;
  onValueChange: (value: TValue) => void;
  'aria-label'?: string;
  className?: string;
}

export function StatusTabs<TValue extends string = string>({
  items,
  value,
  onValueChange,
  'aria-label': ariaLabel,
  className,
}: StatusTabsProps<TValue>) {
  const triggerRefs = useRef(new Map<TValue, HTMLButtonElement>());
  const enabledItems = items.filter((item) => !item.disabled);

  const focusTab = (nextValue: TValue) => {
    triggerRefs.current.get(nextValue)?.focus();
    onValueChange(nextValue);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, item: StatusTabItem<TValue>) => {
    const index = enabledItems.findIndex((enabled) => enabled.value === item.value);
    if (index < 0 || enabledItems.length === 0) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = enabledItems[(index + 1) % enabledItems.length];
      if (next) focusTab(next.value);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = enabledItems[(index - 1 + enabledItems.length) % enabledItems.length];
      if (next) focusTab(next.value);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      const first = enabledItems[0];
      if (first) focusTab(first.value);
    }
    if (event.key === 'End') {
      event.preventDefault();
      const last = enabledItems[enabledItems.length - 1];
      if (last) focusTab(last.value);
    }
  };

  return (
    <div
      data-slot="status-tabs"
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex items-center gap-[calc(3px*var(--app-scale))]', className)}
    >
      {items.map((item) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            ref={(node) => {
              if (node) triggerRefs.current.set(item.value, node);
              else triggerRefs.current.delete(item.value);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            data-state={active ? 'active' : 'inactive'}
            className={cn(
              'inline-flex h-[var(--control-sm)] cursor-pointer items-center gap-[calc(6px*var(--app-scale))] rounded-md px-[calc(11px*var(--app-scale))] text-[calc(13px*var(--app-scale))] outline-none transition-colors',
              'focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--tabs-ring)',
              'disabled:cursor-not-allowed disabled:opacity-45',
              active
                ? 'bg-(--tabs-seg-trigger-bg-active) font-semibold text-(--tabs-seg-trigger-fg-active)'
                : 'text-(--tabs-seg-trigger-fg) hover:text-(--tabs-seg-trigger-fg-hover)',
            )}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, item)}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                data-slot="status-tabs-count"
                className={cn(
                  'font-mono',
                  active ? 'font-medium text-(--tabs-seg-count-fg-active)' : 'text-(--tabs-seg-count-fg)',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
