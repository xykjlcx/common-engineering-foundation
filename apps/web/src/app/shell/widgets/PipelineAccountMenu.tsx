import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { UserRound, Lock, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useShellDeps } from '../deps';
import { resetSession } from '@/lib/reset-auth';
import { appConfig } from '@/config';

// 个人菜单（原型 RailAccount.dc.html L46-64）：锚在 rail 头像右侧，222px 卡；
// 头部 38px 头像 + 姓名 13.5/600 + 部门·岗位 12px，下面两组 32px 菜单项，退出登录独立分组走 danger。
// 板上锚点 left:73 = rail 65 + 8 间距 → Radix side="right" + sideOffset 8 逐值等价。
const ITEM_CLASS =
  'h-(--rail-account-item-h) gap-[calc(10px*var(--app-scale))] rounded-none px-[calc(14px*var(--app-scale))] text-[calc(13px*var(--app-scale))] [&_svg:not([class*=size-])]:size-[calc(15px*var(--app-scale))] [&_svg]:[stroke-width:var(--rail-icon-stroke)]';

export function PipelineAccountMenu() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { useCurrentUser, logout: revokeSession } = useShellDeps();
  const me = useCurrentUser();
  const [open, setOpen] = useState(false);
  // 角色名要等 role 切片接入后端才有（auth.me 目前只回 systemAdmin + 权限码集）；
  // 在那之前只显示管理员这一档，不编造角色标签（与 UserMenu 同口径）。
  const roleLabel = me.systemAdmin ? t('shell.roles.superadmin') : '';

  const openProfile = (tab: 'info' | 'security' | 'preferences', action?: 'password') => {
    setOpen(false);
    void nav({ to: '/admin/profile', search: { tab, action } });
  };

  const logout = async () => {
    // 与 UserMenu 同一套登出流程：后端失败不阻断前端清理，先离开受保护树、卸载后才清缓存。
    // Cookie 会话下前端无凭证可清，服务端 logout 负责吊销会话行 + 清 HttpOnly Cookie。
    try {
      await revokeSession();
    } catch {
      toast.error(t('shell.toast.logoutFailed'));
    }
    await nav({ to: appConfig.routes.login });
    await resetSession();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${me.name} ${roleLabel}`}
          className="flex size-(--rail-avatar-size) shrink-0 items-center justify-center rounded-full border border-(--rail-avatar-border) bg-(--rail-avatar-bg) text-(--rail-avatar-fg) shadow-(--rail-avatar-shadow) outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)"
        >
          <UserRound className="size-(--rail-avatar-icon-size) [stroke-width:var(--rail-icon-stroke)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        // 板值 left:73 = rail 65 + 8 间距 —— 锚点是 rail 右缘，不是头像右缘；头像右缘在 (65+34)/2 = 49.5，
        // 故偏移 = 8 + (65-34)/2 = 23.5。Radix sideOffset 只吃 number，不随 --app-scale 缩放，
        // 90% / 108% 两档下这段间距会差 ≤1.9px（已登记，肉眼不可辨）。
        sideOffset={23.5}
        alignOffset={0}
        className="w-(--rail-account-w) overflow-hidden p-0"
      >
        <div className="flex items-center gap-[calc(11px*var(--app-scale))] px-[calc(14px*var(--app-scale))] pb-[calc(12px*var(--app-scale))] pt-[calc(13px*var(--app-scale))]">
          <span className="flex size-(--rail-account-avatar-size) shrink-0 items-center justify-center rounded-full border border-(--rail-avatar-border) bg-(--rail-avatar-bg) text-(--rail-avatar-fg)">
            <UserRound className="size-[calc(19px*var(--app-scale))] [stroke-width:var(--rail-icon-stroke)]" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[calc(13.5px*var(--app-scale))] font-semibold text-text">
              {me.name}
            </div>
            <div className="mt-[calc(2px*var(--app-scale))] truncate text-[calc(12px*var(--app-scale))] text-(--menu-item-muted-fg)">
              {roleLabel}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="py-[calc(5px*var(--app-scale))]">
          <DropdownMenuItem onClick={() => openProfile('info')} className={ITEM_CLASS}>
            <UserRound />
            {t('shell.user.profile')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openProfile('security', 'password')} className={ITEM_CLASS}>
            <Lock />
            {t('shell.user.changePassword')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="py-[calc(5px*var(--app-scale))]">
          <DropdownMenuItem variant="destructive" onClick={() => void logout()} className={ITEM_CLASS}>
            <LogOut />
            {t('shell.user.logout')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
