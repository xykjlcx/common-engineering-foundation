import type { FileRouteTypes } from '@/routeTree.gen';
import type { LocalizedString } from '@/lib/localized';

// 导航契约层：Shell、布局与 menu-tree 只认这里的形状，不认哪个业务包生产它们。
// 放在 lib 而不是 modules，是为了让 app/shell 不必反向 import 业务子系统（依赖方向只能自上而下）。

// ★ 编译期收窄：种子/菜单 path 只能是路由树里真实存在的路径，typo = 编译错误
export type RoutePath = FileRouteTypes['to'];

export interface Subsystem {
  key: string;
  label: LocalizedString;
  desc: LocalizedString;
  icon: string;
  color: string;
  home: RoutePath;
  // 浮卡内部形态（pipeline 布局消费）：sidemenu = 卡内左菜单（原型 Main 板），
  // stacked = 卡内顶栏模块 tab（原型 SysHome / VouchersSharp 板）。侧栏折叠钮只在 sidemenu 出现。
  cardLayout: 'sidemenu' | 'stacked';
  builtin: boolean;
  enabled: boolean;
  sort: number;
  origin?: 'catalog';
  runtimeManaged?: false;
}

export interface MenuRecord {
  version?: number;
  id: string;
  parentId: string | null;
  subsystemKey: string;
  type: 'dir' | 'menu' | 'action';
  label: LocalizedString;
  icon?: string;
  shortLabel?: LocalizedString;
  path?: RoutePath;
  permission?: string;
  visible: boolean;
  sort: number;
  origin: 'catalog' | 'runtime';
  runtimeManaged: boolean;
}
