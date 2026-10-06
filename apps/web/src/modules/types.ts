// 导航形状的定义已下沉到 lib/navigation（app/shell 不得反向依赖业务包）；
// 这里只做转出口，业务侧仍按 @/modules/types 消费。
export type { MenuRecord, RoutePath, Subsystem } from '@/lib/navigation';

import type { MenuRecord, Subsystem } from '@/lib/navigation';

export interface SubsystemManifest {
  subsystem: Subsystem;
  menuSeed: MenuRecord[];
}
