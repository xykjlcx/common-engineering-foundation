import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import type { JSX } from 'react';
import { initials } from '../model';

/** 姓名首字由业务计算；尺寸与弱化状态统一由 UI Avatar 渲染。 */
export type UserAvatarSize = 'row' | 'form' | 'hero';

export function UserAvatar({
  name,
  src,
  size = 'row',
  muted = false,
  className,
}: {
  name: string;
  src?: string | null;
  size?: UserAvatarSize;
  muted?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <Avatar
      aria-hidden="true"
      data-slot="user-avatar"
      size={size}
      muted={muted || !initials(name)}
      className={className}
    >
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback>
        {initials(name) || <User className="size-[45%]" strokeWidth={1.6} aria-hidden="true" />}
      </AvatarFallback>
    </Avatar>
  );
}
