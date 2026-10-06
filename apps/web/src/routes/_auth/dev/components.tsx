import { Outlet, createFileRoute, notFound, useParams } from '@tanstack/react-router';
import type { ComponentType } from 'react';
import { featuresConfig } from '@/config';
import { DOC_ENTRIES } from './-docs/registry';
import { DocNav } from './-docs/ui/DocNav';

// 组件站布局（antd 官网式）：三轴切换条 + 左导航 + 右侧单页。取代旧的 /dev/theme-states 单文件矩阵。
//
// 三轴切换条来自 -docs/sections/_appearance.tsx（下划线前缀 = 不是组件页，注册表里没有它）。
// 用 glob 取而不是直接 import：迁移期这个文件可能还不存在，缺了就整页不带切换条，而不是白屏。
const appearanceModules = import.meta.glob<{ default: ComponentType }>('./-docs/sections/_appearance.tsx', {
  eager: true,
});
// 取 values[0] 而不是按 key 索引：这个 glob 至多命中一个文件，按 key 索引一旦键名形态与预期差一点
// （前缀 / 归一化），就会变成"静默不渲染切换条"，最难发现的那种失败。
const AppearanceBar = Object.values(appearanceModules)[0]?.default;

export const Route = createFileRoute('/_auth/dev/components')({
  // dev 组件站：仅开发态 / 视觉验收（VITE_ENABLE_VISUAL_DEBUG）可见，生产环境视同不存在。
  // 无此门则任何登录用户直连 URL 即可访问内部组件画廊。
  beforeLoad: () => {
    if (!featuresConfig.isDev && !featuresConfig.enableVisualDebug) notFound({ throw: true });
  },
  component: ComponentsDocLayout,
});

function ComponentsDocLayout() {
  // 布局路由本身没有 key 参数，取当前叶子匹配的参数用于导航高亮
  const params = useParams({ strict: false });

  return (
    <div className="flex min-h-0 flex-1 flex-col text-text">
      {AppearanceBar && (
        <div className="shrink-0 border-b border-border bg-surface px-[calc(16px*var(--app-scale))] py-[calc(10px*var(--app-scale))]">
          <AppearanceBar />
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <DocNav entries={DOC_ENTRIES} activeKey={params.key} />
        {/* 右栏独立滚动：左导航与三轴切换条常驻，切页只滚内容 */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
