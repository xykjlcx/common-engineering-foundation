import { useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Bell, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Subsystem } from '@/lib/navigation';
import { subsystemKeyFromPath } from '../subsystem-key';
import { useShellDeps, type ShellMessagesDeps } from '../deps';
import { PipelineAccountMenu } from './PipelineAccountMenu';

// 子系统 rail（三段式，值表见 docs/design/pipeline.design.md）：
//   ① 身份区 34px 头像 → 个人菜单（个人中心 / 修改密码 / 退出登录）；
//   ② 子系统区：系统管理排第一（它再特殊也是子系统，不是软件的全局设置），后接各业务子系统；
//   ③ 全局区（底部）：界面设置。B3-01 减法后不再挂演示消息中心。
// 激活指示是贴屏幕左缘的 3×22 胶囊：板上是整条 rail 上一个 absolute 元素（top 随激活项算），
// 这里改为挂在激活项自身内部、用 (rail 宽 - 图标盒宽) / 2 的负偏移回到 rail 左缘 —— 几何等价，
// 但不需要测量任何 DOM。
const INDICATOR_OFFSET = 'calc((var(--rail-w) - var(--rail-item-size)) / -2)';

function ActiveIndicator() {
  return (
    <span
      aria-hidden="true"
      className="absolute top-1/2 h-(--rail-indicator-h) w-(--rail-indicator-w) -translate-y-1/2 rounded-r-full bg-(--rail-indicator-bg)"
      style={{ left: INDICATOR_OFFSET }}
    />
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'relative flex size-(--rail-item-size) shrink-0 items-center justify-center rounded-4 outline-none',
            'focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)',
            active ? 'text-(--rail-item-fg-current)' : 'text-(--rail-item-fg)',
          )}
        >
          {active && <ActiveIndicator />}
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function RailDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('shrink-0', className)}>
      <div className="h-px w-(--rail-divider-w) bg-(--rail-divider-bg)" />
    </div>
  );
}

export function PipelineRail({
  subsystems,
  onOpenPreferences,
}: {
  subsystems: Subsystem[];
  onOpenPreferences: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const nav = useNavigate();

  // 消息中心不是子系统，是全局功能：住底部全局区，路径由装配层给出。
  const { messages } = useShellDeps();
  const activeKey = subsystemKeyFromPath(pathname);
  const messagesActive = messages ? pathname.startsWith(messages.path) : false;
  // 系统管理（builtin）排第一，业务子系统按注册顺序跟在后面
  const ordered = [...subsystems.filter((s) => s.builtin), ...subsystems.filter((s) => !s.builtin)];

  return (
    <div
      data-slot="pipeline-rail"
      className="relative flex w-(--rail-w) shrink-0 flex-col items-center bg-(--rail-glass-bg) py-(--rail-py)"
    >
      <PipelineAccountMenu />
      <RailDivider className="mb-[calc(12px*var(--app-scale))] mt-[calc(13px*var(--app-scale))]" />

      <div data-slot="pipeline-rail-subsystems" className="flex flex-col items-center gap-(--rail-item-gap)">
        {ordered.map((s) => (
          <RailButton
            key={s.key}
            label={lv(s.label, i18n.language)}
            active={!messagesActive && s.key === activeKey}
            onClick={() => void nav({ to: s.home })}
          >
            <Icon
              name={s.icon}
              className={cn(
                '[stroke-width:var(--rail-icon-stroke)]',
                s.builtin ? 'size-(--rail-sys-icon-size)' : 'size-(--rail-icon-size)',
              )}
            />
          </RailButton>
        ))}
      </div>

      <div className="flex-1" />

      <RailDivider className="mb-[calc(10px*var(--app-scale))]" />
      <div data-slot="pipeline-rail-global" className="flex flex-col items-center gap-(--rail-item-gap)">
        {messages && <RailMessages messages={messages} active={messagesActive} />}
        <RailButton label={t('shell.appearance')} active={false} onClick={onOpenPreferences}>
          <Palette className="size-(--rail-icon-size) [stroke-width:var(--rail-icon-stroke)]" />
        </RailButton>
      </div>
    </div>
  );
}

// 未接入消息服务的构建不挂载查询：装配层给的 messages 为 null 时本组件整个不渲染。
function RailMessages({ messages, active }: { messages: ShellMessagesDeps; active: boolean }) {
  const { path, useUnreadCount } = messages;
  const { t } = useTranslation();
  const nav = useNavigate();
  const unread = useUnreadCount();
  return (
    <RailButton label={t('shell.pipeline.messages')} active={active} onClick={() => void nav({ to: path })}>
      <Bell className="size-(--rail-icon-size) [stroke-width:var(--rail-icon-stroke)]" />
      {unread > 0 && (
        <span
          data-slot="rail-unread"
          className="absolute top-[calc(3px*var(--app-scale))] right-[calc(3px*var(--app-scale))] flex h-[calc(15px*var(--app-scale))] min-w-[calc(15px*var(--app-scale))] items-center justify-center rounded-full border-[1.5px] border-(--rail-bg) bg-(--rail-dot-bg) px-[calc(3px*var(--app-scale))] text-[calc(10px*var(--app-scale))] leading-none font-semibold text-white"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </RailButton>
  );
}
