import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageBreadcrumbItem } from '@/components/pro/page-scaffold';
import type { Subsystem } from '@/lib/navigation';
import { PipelineSubsystemBrand } from './PipelineSubsystemBrand';
import { SidebarToggle } from './SidebarToggle';

// 面包屑行（原型 Main.dc.html L118-126）：46px、无下边框、padding 0 22、gap 9；
// 分隔符 "/" 走面包屑专用灰，末级 13.5/500 墨色，右侧铃铛。板上的「回首页」小房子已去掉
// 路径直接从子系统 / 页面读起，二三级顺着往下排。
// 侧栏折叠时（RailCollapsed L55-61）行首是 22px 子系统身份段，它就是首级 crumb；
// 展开钮（板放 rail 上，改为放卡内）排在最前、与身份段之间一道 1px 竖分隔线，
// 与展开态侧栏头部行的折叠钮位置连续。展开态侧栏头已有子系统名，面包屑不再重复它。
export function PipelineBreadcrumbBar({
  breadcrumbs,
  brand,
  onExpand,
  suffix,
}: {
  breadcrumbs: PageBreadcrumbItem[];
  brand?: Subsystem | undefined;
  onExpand?: () => void;
  /** 行尾可选槽位（原挂顶栏铃铛，2026-09-03 铃铛移到 rail 底部全局区后默认为空） */
  suffix?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div
      data-slot="pipeline-breadcrumb-bar"
      className={cn(
        'flex h-(--rail-crumb-h) shrink-0 items-center gap-[calc(9px*var(--app-scale))] pr-[calc(22px*var(--app-scale))]',
        // 行首带展开钮时左内距收到 14px（钮自身 28px 含 6px 留白，图标仍落在板 22px 起点附近）
        onExpand ? 'pl-[calc(14px*var(--app-scale))]' : 'pl-[calc(22px*var(--app-scale))]',
      )}
    >
      {onExpand && (
        <>
          <SidebarToggle label={t('shell.nav.expand')} icon={PanelLeftOpen} onClick={onExpand} />
          <span
            aria-hidden="true"
            className="mr-[calc(2px*var(--app-scale))] h-[calc(14px*var(--app-scale))] w-px shrink-0 bg-(--page-breadcrumb-divider)"
          />
        </>
      )}
      {brand && <PipelineSubsystemBrand subsystem={brand} size="crumb" />}
      {breadcrumbs.map((item, index) => {
        const last = index === breadcrumbs.length - 1;
        const withSeparator = index > 0 || !!brand;
        return (
          <span
            key={`${item.label}-${index}`}
            className="flex min-w-0 items-center gap-[calc(9px*var(--app-scale))]"
          >
            {withSeparator && (
              <span
                aria-hidden="true"
                className="text-[calc(13px*var(--app-scale))] text-(--rail-crumb-sep-fg)"
              >
                /
              </span>
            )}
            <span
              className={
                last
                  ? 'truncate text-[calc(13.5px*var(--app-scale))] font-medium text-text'
                  : 'truncate text-[calc(13.5px*var(--app-scale))] text-text-3'
              }
            >
              {item.label}
            </span>
          </span>
        );
      })}
      <div className="flex-1" />
      {suffix}
    </div>
  );
}
