import { useLocation } from '@tanstack/react-router';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useAppearance } from '@/stores/appearance';
import { cn } from '@/lib/utils';

// 页面过渡容器保持稳定，避免菜单或 search 导航时把内容区当整页重建。

const ANIM: Record<string, string> = {
  none: '',
  fade: 'pg-fade .32s ease',
  slide: 'pg-slide .34s cubic-bezier(.22,.61,.36,1)',
  up: 'pg-up .34s cubic-bezier(.22,.61,.36,1)',
  scale: 'pg-scale .3s cubic-bezier(.22,.61,.36,1)',
};

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const anim = useAppearance((s) => s.pageAnim);
  const { pathname } = useLocation();
  const frameRef = useRef<HTMLDivElement>(null);
  const animation = ANIM[anim] || '';

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    if (!animation) {
      frame.style.animation = '';
      return;
    }

    // 保持节点不重挂载，通过重置 animation 触发同一容器的进场动画。
    frame.style.animation = 'none';
    void frame.offsetHeight;
    frame.style.animation = animation;
  }, [animation, pathname]);

  return (
    <div
      ref={frameRef}
      className={cn('flex min-h-full flex-col', className)}
      style={{ animation: animation || undefined }}
    >
      {children}
    </div>
  );
}
