import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * SoftSwitch —— 软浮起（soft UI / 轻量新拟态）开关实验件。
 * 与 `Switch` 同一 Radix 底座、同一受控 API（checked / onCheckedChange / disabled / size），
 * 视觉走 `--soft-*` token 族，状态机住 global.css 的 `.ui-soft-*`；不替换现有 Switch。
 * `iconChecked` / `iconUnchecked` 可在旋钮里放图标（如 Sun / Moon），随状态淡入淡出。
 */
function SoftSwitch({
  className,
  size = 'default',
  iconChecked,
  iconUnchecked,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default';
  iconChecked?: React.ReactNode;
  iconUnchecked?: React.ReactNode;
}) {
  const hasIcon = Boolean(iconChecked || iconUnchecked);
  return (
    <SwitchPrimitive.Root
      data-slot="soft-switch"
      data-size={size}
      className={cn(
        'ui-soft-track ui-soft-switch peer inline-flex shrink-0 cursor-pointer items-center rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="soft-switch-thumb"
        className="ui-soft-thumb pointer-events-none relative block rounded-full"
      >
        {hasIcon ? (
          <>
            <span
              data-soft-icon="unchecked"
              className="absolute inset-0 flex items-center justify-center text-(--soft-thumb-fg) [&_svg]:size-[55%]"
            >
              {iconUnchecked}
            </span>
            <span
              data-soft-icon="checked"
              className="absolute inset-0 flex items-center justify-center text-(--soft-thumb-fg) [&_svg]:size-[55%]"
            >
              {iconChecked}
            </span>
          </>
        ) : null}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { SoftSwitch };
