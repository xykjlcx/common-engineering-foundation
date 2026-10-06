import * as React from 'react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * SoftSegmented —— 软浮起风格的单选分段控件（如「Light / Dark / System」主题切换）。
 * 底座是 Radix RadioGroup（role=radiogroup + roving focus，方向键切换），
 * 受控 API 与 RadioGroup 一致：value / defaultValue / onValueChange / disabled。
 * 视觉与 SoftSwitch 共用 `--soft-*` token 与 `.ui-soft-*` 状态机：整条是凹槽轨道，选中项即凸起旋钮。
 */
function SoftSegmented({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="soft-segmented"
      orientation="horizontal"
      className={cn(
        'ui-soft-track inline-flex w-fit items-center gap-1 rounded-(--radius-xl) p-[calc(3px*var(--app-scale))] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function SoftSegmentedItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="soft-segmented-item"
      className={cn(
        'ui-soft-thumb ui-soft-seg-item inline-flex h-[calc(var(--control-btn-md)-6px*var(--app-scale))] min-w-[calc(72px*var(--app-scale))] cursor-pointer items-center justify-center gap-2 rounded-(--radius-lg) px-4 text-sm font-medium whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:size-[calc(16px*var(--app-scale))] [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
}

export { SoftSegmented, SoftSegmentedItem };
