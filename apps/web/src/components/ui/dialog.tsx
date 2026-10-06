import * as React from 'react';
import { XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const POINTER_ORIGIN_TTL = 100;
let lastPointer: { x: number; y: number } | null = null;
let pointerTimer: ReturnType<typeof setTimeout> | undefined;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    (event) => {
      lastPointer = { x: event.clientX, y: event.clientY };
      if (pointerTimer !== undefined) clearTimeout(pointerTimer);
      pointerTimer = setTimeout(() => {
        lastPointer = null;
        pointerTimer = undefined;
      }, POINTER_ORIGIN_TTL);
    },
    true,
  );
}

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'anim-modal-mask fixed inset-0 z-50 bg-(--overlay-mask-bg) backdrop-blur-[var(--overlay-mask-blur)]',
        className,
      )}
      {...props}
    />
  );
}

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  closeOnInteractOutside?: boolean;
};

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeOnInteractOutside = false,
  onPointerDownOutside,
  onInteractOutside,
  ref,
  style,
  ...props
}: DialogContentProps) {
  // 原点算出来之前不挂动画类：动画的 from 帧是 scale(0)，一挂上就量不到真实 rect 了。
  const [transformOrigin, setTransformOrigin] = React.useState<string | null>(null);
  const measured = React.useRef(false);

  // 在 ref 回调里量而不是 effect 里量：Radix 的 Portal 首帧渲染 null、
  // 要等它自己的 layout effect 才把内容挂进 body，[]-deps 的 effect 里 ref 还是空的。
  // ref 回调发生在 commit 阶段、绘制之前，这里 setState 会同步补渲染，所以首帧就带正确原点，不闪。
  //
  // 必须 useCallback 保持身份稳定：身份一变 React 会 null → node 地重放一遍回调，
  // 那时元素已经挂着 scale 动画，重量就是缩放后的框。
  // 关闭时 Radix 只卸载 portal 里的内容、留着本组件，所以卸载（element === null）时
  // 要把原点与已量标记一起清掉，否则第二次打开会沿用上一次的原点。
  const setContentRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      if (typeof ref === 'function') ref(element);
      else if (ref) ref.current = element;
      if (!element) {
        measured.current = false;
        setTransformOrigin(null);
        return;
      }
      if (measured.current) return;
      measured.current = true;
      if (!lastPointer) {
        setTransformOrigin('50% 50%');
        return;
      }
      const rect = element.getBoundingClientRect();
      setTransformOrigin(
        `${Math.round(lastPointer.x - rect.left)}px ${Math.round(lastPointer.y - rect.top)}px`,
      );
    },
    [ref],
  );

  const handlePointerDownOutside: NonNullable<DialogContentProps['onPointerDownOutside']> = (event) => {
    onPointerDownOutside?.(event);
    if (!closeOnInteractOutside && !event.defaultPrevented) {
      event.preventDefault();
    }
  };
  const handleInteractOutside: NonNullable<DialogContentProps['onInteractOutside']> = (event) => {
    onInteractOutside?.(event);
    if (!closeOnInteractOutside && !event.defaultPrevented) {
      event.preventDefault();
    }
  };

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        {...props}
        ref={setContentRef}
        data-slot="dialog-content"
        className={cn(
          // 居中改走 inset-0 + margin:auto（over-constrained 时 auto 外边距各取一半，
          // 内容超高也照旧上下对称溢出，与旧 translate 方案等价）：
          // transform 从此只归 zoom 动画用，不再和居中打架。
          'fixed inset-0 z-50 m-auto grid h-fit w-full max-w-[calc(100%-2rem)] gap-4 rounded-(--overlay-radius-modal) border border-(--overlay-border) bg-(--overlay-bg) p-6 text-(--overlay-fg) shadow-(--overlay-shadow-modal) outline-none sm:max-w-lg',
          transformOrigin === null ? undefined : 'anim-modal-zoom',
          className,
        )}
        style={transformOrigin === null ? style : { ...style, transformOrigin }}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute right-6 top-[calc(22px*var(--app-scale))] flex size-[calc(30px*var(--app-scale))] cursor-pointer items-center justify-center rounded-7 text-(--overlay-close-fg) outline-none transition-colors hover:bg-(--overlay-close-bg-hover) hover:text-(--overlay-close-fg-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring) disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none"
          >
            <XIcon className="size-[calc(18px*var(--app-scale))]" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

// DialogTitle 的排印类串导出为单一真相源：组件站 form-dialog 页的可截图矩阵 import 同一常量，
// 防止两处 --title-* 排印类漂移（截图载体与真实组件不再各自硬编码同一串）。
const dialogTitleClassName =
  'text-lg leading-none font-semibold [text-transform:var(--title-transform)] [letter-spacing:var(--title-tracking)]';

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(dialogTitleClassName, className)}
      {...props}
    />
  );
}

function DialogDescription({
  size = 'default',
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description> & { size?: 'default' | 'compact' }) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-(--overlay-muted-fg)',
        size === 'compact' ? 'text-[calc(12.5px*var(--app-scale))]' : 'text-sm',
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  dialogTitleClassName,
};
