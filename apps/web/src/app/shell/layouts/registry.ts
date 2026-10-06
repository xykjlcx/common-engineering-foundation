import type { ComponentType } from 'react';
import type { ShellLayoutProps } from './types';
import type { LayoutKey } from './keys';
import { SidebarLayout } from './SidebarLayout';
import { RailLayout } from './RailLayout';
import { InsetLayout } from './InsetLayout';
import { PipelineLayout } from './PipelineLayout';

// 布局注册表：新增布局 = 新文件 + keys.ts 加一个 key + 此处加一行。
// Record<LayoutKey, …> 让两处必须同步：漏登记 key 缺属性报错，漏建组件多属性报错。
export const layoutRegistry: Record<LayoutKey, ComponentType<ShellLayoutProps>> = {
  sidebar: SidebarLayout,
  rail: RailLayout,
  inset: InsetLayout,
  pipeline: PipelineLayout,
};
