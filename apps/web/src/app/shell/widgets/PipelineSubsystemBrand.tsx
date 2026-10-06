import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import type { Subsystem } from '@/lib/navigation';

// 子系统身份（logo + 名称）。板上出现在三处，几何各不相同：
//   card  — 卡内侧栏头 / 卡内顶栏：26px logo + 14px svg + 名称 14/600（Main L54-57、SysHome 顶栏）
//   crumb — 侧栏折叠后回落到面包屑行行首：22px logo + 12px svg + 名称 13.5/600（RailCollapsed L57-60）
// 板上 logo 是每子系统一套 180° 青蓝／墨灰渐变（逐值见 pipeline.design.md）；本项目 Subsystem 只有单色 color
// 字段，故沿用 SubsystemSwitcher 的填色口径（内置子系统吃 --accent-emphasis）。
export function PipelineSubsystemBrand({
  subsystem,
  size = 'card',
}: {
  subsystem: Subsystem | undefined;
  size?: 'card' | 'crumb';
}) {
  const { i18n } = useTranslation();
  if (!subsystem) return null;
  const isCrumb = size === 'crumb';

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-[calc(9px*var(--app-scale))]">
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-4 text-white shadow-(--rail-logo-shadow)',
          isCrumb ? 'size-(--rail-crumb-logo-size)' : 'size-(--rail-card-logo-size)',
        )}
        style={{ background: subsystem.builtin ? 'var(--accent-emphasis)' : subsystem.color }}
      >
        <Icon
          name={subsystem.icon}
          className={cn(
            '[stroke-width:1.8]',
            isCrumb ? 'size-(--rail-crumb-logo-icon-size)' : 'size-(--rail-card-logo-icon-size)',
          )}
        />
      </span>
      <span
        className={cn(
          'truncate font-semibold text-text',
          isCrumb ? 'text-[calc(13.5px*var(--app-scale))]' : 'text-[calc(14px*var(--app-scale))]',
        )}
      >
        {lv(subsystem.label, i18n.language)}
      </span>
    </div>
  );
}
