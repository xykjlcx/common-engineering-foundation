import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// 浮卡内的侧栏折叠 / 展开钮：28px 无边 ghost 图标钮，hover 浅灰底，tooltip 说明动作。
// 展开态住 NavMenuPipeline 头部行右端，折叠态住 PipelineBreadcrumbBar 行首；
// key 随图标变化重放 anim-rail-toggle 旋转入场（global.css），沿用原 rail 折叠钮的反馈。
export function SidebarToggle({
  label,
  icon: IconComponent,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          data-slot="sidebar-toggle"
          className="flex size-(--control-sm) shrink-0 cursor-pointer items-center justify-center rounded-md text-(--rail-toggle-fg) outline-none hover:bg-(--rail-menu-bg-hover) hover:text-(--rail-toggle-fg-active) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)"
        >
          <span key={IconComponent.displayName ?? 'icon'} className="anim-rail-toggle flex">
            <IconComponent className="size-[calc(16px*var(--app-scale))] [stroke-width:var(--rail-icon-stroke)]" />
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
