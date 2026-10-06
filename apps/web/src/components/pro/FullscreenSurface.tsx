/**
 * FullscreenSurface —— 表格「全屏」态承载浮卡。
 *
 * 抄袭源：ant-design-pro ProTable fullScreen 的语义（提升为整屏、Esc 退出）
 * + 本仓 PipelineLayout 浮卡与 ui/button.tsx(ghost/icon) 改造落 token。
 * 板：design-explore/pipeline-board/DSAdditions.dc.html 4.9「全屏态」——
 * 顶部 44 高只留标题 + 副标题 + Esc 提示 + 退出钮（板底 #fffffd / 边 rgba(0,0,0,.05)
 * → --page-surface-bg / --page-surface-border），正文吃整块高度。
 *
 * 它不是 modal：不加遮罩、不锁焦点、不用 Radix Dialog；只是把内容提到 fixed 层。
 * 非 inline 时 portal 到 document.body：`fixed` 会被任何带 transform / filter /
 * backdrop-filter 的祖先接管为包含块，而 pipeline 布局的浮卡就带 backdrop-blur——
 * 不 portal 的话「全屏」在 pipeline 布局只填满浮卡、在另外三种布局才盖住整屏，
 * 同一个钮跨布局表现不一致；裁决是必须一致盖住 rail。
 * pro 组件纪律：不 useTranslation、不 import @/modules/**，文案全部经 props 注入。
 */
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface FullscreenSurfaceProps {
  title: ReactNode;

  subtitle?: ReactNode;

  escHint?: ReactNode;
  exitLabel: string;
  onExit: () => void;
  /**
   * 静态缩样：渲染成非 fixed、固定高度的样子（默认 300 高，可用 className 覆盖），
   * 不监听 Esc、不锁 body 滚动。只给状态矩阵截图用。
   */
  inline?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * 判断全屏层之上还压着别的可 dismiss 浮层（弹窗 / 抽屉 / 菜单 / 浮卡）。
 * Esc 要一层一层剥：弹窗开着时按 Esc 只关弹窗，不能连全屏一起退。
 * tooltip 不算——它只跟着 hover 出现，悬着提示时按 Esc 仍该退出全屏。
 */
function hasDismissableLayerAbove(): boolean {
  if (document.querySelector('[data-slot="dialog-content"], [data-slot="sheet-content"]')) {
    return true;
  }
  for (const popper of document.querySelectorAll('[data-radix-popper-content-wrapper]')) {
    if (!popper.querySelector('[data-slot="tooltip-content"]')) return true;
  }
  return false;
}

export function FullscreenSurface({
  title,
  subtitle,
  escHint,
  exitLabel,
  onExit,
  inline = false,
  className,
  children,
}: FullscreenSurfaceProps) {
  useEffect(() => {
    if (inline) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (hasDismissableLayerAbove()) return;
      onExit();
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [inline, onExit]);

  const surface = (
    <div
      data-slot="fullscreen-surface"
      data-inline={inline || undefined}
      className={cn(
        'flex',
        inline
          ? 'relative h-[calc(300px*var(--app-scale))] w-full'
          : 'fixed inset-0 z-40 bg-(--pro-page-bg) p-[calc(10px*var(--app-scale))]',
        className,
      )}
    >
      <section
        data-slot="fullscreen-surface-card"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-(--card-radius) border border-(--page-surface-border) bg-(--page-surface-bg) shadow-(--page-surface-shadow)"
      >
        <header
          data-slot="fullscreen-surface-header"
          className="flex h-[calc(44px*var(--app-scale))] shrink-0 items-center gap-[calc(10px*var(--app-scale))] border-b border-(--page-section-divider) px-[calc(16px*var(--app-scale))]"
        >
          <span className="text-[calc(14px*var(--app-scale))] font-semibold text-(--text)">{title}</span>
          {subtitle === undefined ? null : (
            <span className="text-[calc(12px*var(--app-scale))] text-(--text-3)">{subtitle}</span>
          )}
          <span className="flex-1" />
          {escHint === undefined ? null : (
            <span
              data-slot="fullscreen-surface-esc"
              className="text-[calc(11.5px*var(--app-scale))] text-(--text-4)"
            >
              {escHint}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-slot="fullscreen-surface-exit"
                aria-label={exitLabel}
                onClick={onExit}
              >
                <Minimize data-icon="only" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {exitLabel}
            </TooltipContent>
          </Tooltip>
        </header>
        <div data-slot="fullscreen-surface-body" className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
      </section>
    </div>
  );

  if (inline) return surface;
  // SSR / 无 document 环境不渲染（本仓是纯 CSR，这一支只为守住引用方的边界）
  if (typeof document === 'undefined') return null;
  return createPortal(surface, document.body);
}
