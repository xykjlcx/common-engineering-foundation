/**
 * FloatingActionBar —— 行选中后浮在纸面之上的深色批量操作条。
 *
 * 板：design-explore/pipeline-board/ActionDark.dc.html L366-378。逐值出处：
 *   · 容器      L367  left:50%; bottom:100px; transform:translateX(-50%); z-index:30; height:44px;
 *                     display:flex; align-items:center; gap:3px; padding:0 8px 0 16px; border-radius:8px;
 *                     background:#2f2e30;
 *                     box-shadow: 0 10px 32px rgba(0,0,0,0.30), 0 2px 6px rgba(0,0,0,0.18)
 *              L48   浮卡 margin:10px 10px 10px 0 → 板内 bottom 100 + 浮卡下边距 10 = 视口 bottom 110
 *   · 已选文案  L368  font-size:13px; color:#a6a6a3；计数 <span class="mono" color:#ffb066; font-weight:600>
 *   · 分隔      L369  width:1px; height:16px; background:rgba(255,255,255,0.16)
 *   · 动作钮    L369-374  height:28px; padding:0 10px; border-radius:4px; font-size:13px; font-weight:500
 *                     默认 color:#f4f4f2，首个 background:rgba(255,255,255,0.10)
 *                     danger color:#ff9a9a；muted（更多）color:#a6a6a3
 *   · 「更多」  L373  gap:5px + svg 11×11 chevron
 *   · 关闭钮    L377  width:28px; height:28px; border-radius:4px; svg 14×14 stroke=#a6a6a3
 *                     板上「取消选择」文字钮 + 关闭钮并存，语义重复且占位，故：
 *                     只保留右端关闭钮，点它即清空选择；无障碍名由 closeLabel 提供。
 *
 * 落 token：44 = --action-bar-h；110 = --action-bar-bottom；28 = --control-sm；
 * 8px 圆角 = --overlay-radius（pipeline 16×.5）；4px 圆角 = rounded-md；配色 = --action-bar-*。
 * 表格滚动容器需吃 DataTable 的 `floatingBarSpace` 补 --action-bar-space 底部 padding，防末行被盖。
 *
 * pro 组件纪律：不 useTranslation、不 import @/modules/**，文案全部经 props 注入。
 */
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type FloatingActionTone = 'default' | 'danger' | 'muted';

export interface FloatingActionBarAction {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: FloatingActionTone;
  disabled?: boolean;
}

export interface FloatingActionBarProps {
  count: number;

  selectedLabel: string;

  countLabel: string;
  actions: FloatingActionBarAction[];
  /** 收进「更多」下拉的动作 */
  moreActions?: FloatingActionBarAction[];
  moreLabel?: string;
  /** 右端 28×28 关闭钮 = 清空选择（唯一退出口，不再有「取消选择」文字钮） */
  onClearSelection: () => void;
  /** 关闭钮的无障碍名（如「取消选择」） */
  closeLabel: string;
  'aria-label'?: string;
  className?: string;
}

const toneClassName: Record<FloatingActionTone, string> = {
  default: 'text-(--action-bar-item-fg)',
  danger: 'text-(--action-bar-item-fg-danger)',
  muted: 'text-(--action-bar-item-fg-muted)',
};

const actionBaseClassName =
  'inline-flex h-[var(--control-sm)] shrink-0 cursor-pointer items-center rounded-md px-[calc(10px*var(--app-scale))] text-[calc(13px*var(--app-scale))] font-medium outline-none transition-colors hover:bg-(--action-bar-item-bg-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--action-bar-item-bg-hover) disabled:cursor-not-allowed disabled:opacity-45';

function ActionBarDivider() {
  return (
    <span
      aria-hidden="true"
      data-slot="floating-action-bar-divider"
      className="h-[calc(16px*var(--app-scale))] w-px shrink-0 bg-(--action-bar-divider)"
    />
  );
}

export function FloatingActionBar({
  count,
  selectedLabel,
  countLabel,
  actions,
  moreActions,
  moreLabel,
  onClearSelection,
  closeLabel,
  'aria-label': ariaLabel,
  className,
}: FloatingActionBarProps) {
  const hasMore = !!moreActions && moreActions.length > 0 && moreLabel !== undefined;

  return (
    <div
      data-slot="floating-action-bar"
      role="toolbar"
      aria-label={ariaLabel ?? selectedLabel}
      className={cn(
        'fixed bottom-[var(--action-bar-bottom)] left-1/2 z-30 flex h-[var(--action-bar-h)] -translate-x-1/2 items-center gap-[calc(3px*var(--app-scale))] rounded-(--overlay-radius) bg-(--action-bar-bg) pr-[calc(8px*var(--app-scale))] pl-[calc(16px*var(--app-scale))] shadow-(--action-bar-shadow)',
        className,
      )}
    >
      <span
        data-slot="floating-action-bar-summary"
        className="shrink-0 text-[calc(13px*var(--app-scale))] text-(--action-bar-label-fg)"
      >
        {selectedLabel} <span className="font-mono font-semibold text-(--action-bar-count-fg)">{count}</span>{' '}
        {countLabel}
      </span>

      <ActionBarDivider />

      {actions.map((action, index) => (
        <button
          key={action.id}
          type="button"
          data-slot="floating-action-bar-action"
          data-tone={action.tone ?? 'default'}
          disabled={action.disabled}
          className={cn(
            actionBaseClassName,
            toneClassName[action.tone ?? 'default'],
            index === 0 && 'bg-(--action-bar-item-bg-hover)',
          )}
          onClick={action.onSelect}
        >
          {action.label}
        </button>
      ))}

      {hasMore && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-slot="floating-action-bar-more"
              className={cn(actionBaseClassName, toneClassName.muted, 'gap-[calc(5px*var(--app-scale))]')}
            >
              <span>{moreLabel}</span>
              <ChevronDown aria-hidden="true" className="size-[calc(11px*var(--app-scale))]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {moreActions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                disabled={action.disabled}
                variant={action.tone === 'danger' ? 'destructive' : 'default'}
                onSelect={action.onSelect}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ActionBarDivider />

      <button
        type="button"
        data-slot="floating-action-bar-close"
        aria-label={closeLabel}
        className={cn(
          'inline-flex size-[var(--control-sm)] shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-colors hover:bg-(--action-bar-item-bg-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--action-bar-item-bg-hover)',
          toneClassName.muted,
        )}
        onClick={onClearSelection}
      >
        <X aria-hidden="true" className="size-[calc(14px*var(--app-scale))]" />
      </button>
    </div>
  );
}
