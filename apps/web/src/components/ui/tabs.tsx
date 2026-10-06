import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Tabs —— 基础标签页，两种结构共用一条「滑动指示器」：
 *   · default（segmented）：指示器是选中项底下的药丸（--tabs-seg-trigger-bg-active），随选中项平移 / 变宽；
 *   · line：指示器是 2px 底线（--tabs-line-indicator），机制与 pro/AnimatedTabs 同源。
 * 指示器由 TabsList 测量 `[data-state=active]` 触发器的 offset 得出，触发器本身不再各画各的选中底 / 下划线，
 * 切换时才有连续位移动画——各画各的选中底会让动画断掉，几何也与页头 tab 不协调。
 * 几何对齐基座画布：触发器高 = --rail-tab-h（30）、13.5px、选中 600；seg 内距 11px；line 间距 24。
 */
function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  [
    'group/tabs-list relative inline-flex w-fit items-center justify-center text-(--tabs-seg-trigger-fg)',
    'group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'rounded-(--radius-md) bg-(--tabs-seg-list-bg) p-[calc(3px*var(--app-scale))]',
        line: 'gap-6 rounded-none border-b border-(--tabs-line-border) bg-transparent p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface IndicatorRect {
  left: number;
  top: number;
  width: number;
  height: number;
  ready: boolean;
}

/** 测量 list 内 `[data-state=active]` 触发器的 offset 矩形；尺寸变化 / 状态切换都重测 */
function useActiveIndicator(listRef: React.RefObject<HTMLDivElement | null>) {
  const [rect, setRect] = React.useState<IndicatorRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  });

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]');
      if (!active) {
        setRect((prev) => (prev.ready ? { ...prev, ready: false } : prev));
        return;
      }
      setRect({
        left: active.offsetLeft,
        top: active.offsetTop,
        width: active.offsetWidth,
        height: active.offsetHeight,
        ready: true,
      });
    };

    measure();
    const mutation = new MutationObserver(measure);
    mutation.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
      childList: true,
    });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(list);
    return () => {
      mutation.disconnect();
      resize?.disconnect();
    };
  }, [listRef]);

  return rect;
}

function TabsList({
  className,
  variant = 'default',
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const indicator = useActiveIndicator(listRef);
  const isLine = variant === 'line';

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
      <span
        data-slot="tabs-indicator"
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-0 top-0 opacity-0 transition-[transform,width,height,opacity] duration-200 ease-out motion-reduce:transition-none',
          isLine
            ? 'h-[calc(2px*var(--app-scale))] rounded-full bg-(--tabs-line-indicator)'
            : 'rounded-(--radius-sm) bg-(--tabs-seg-trigger-bg-active) shadow-(--tabs-seg-trigger-shadow-active)',
          indicator.ready && 'opacity-100',
        )}
        style={{
          width: `${indicator.width}px`,
          height: isLine ? undefined : `${indicator.height}px`,
          transform: isLine
            ? `translate(${indicator.left}px, ${indicator.top + indicator.height - 1}px)`
            : `translate(${indicator.left}px, ${indicator.top}px)`,
        }}
      />
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        [
          'relative z-10 inline-flex h-[var(--rail-tab-h)] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-(--radius-sm) border border-transparent px-[calc(11px*var(--app-scale))] text-[calc(13.5px*var(--app-scale))] font-normal text-(--tabs-seg-trigger-fg) outline-none transition-[color,font-weight]',
          'hover:text-(--tabs-seg-trigger-fg-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--tabs-ring) disabled:pointer-events-none disabled:opacity-50',
          'group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start',
          'data-[state=active]:font-semibold data-[state=active]:text-(--tabs-seg-trigger-fg-active)',
          'ui-tabs-line-trigger group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-0 group-data-[variant=line]/tabs-list:px-1',
          '[&_[data-icon]]:pointer-events-none [&_[data-icon]]:shrink-0 [&_[data-icon]]:size-[calc(15px*var(--app-scale))]',
        ].join(' '),
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
