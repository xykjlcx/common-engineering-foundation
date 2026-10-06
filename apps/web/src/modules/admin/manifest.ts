// admin 是内核子系统：登录后 Shell、消息、个人中心和基础权限都依赖它。
// 页面与按钮身份从 generated catalog 派生，manifest 只保留子系统元数据。
import { demoMenuSeedBySubsystem } from '@/modules/demo-menu-seed.generated';
import type { SubsystemManifest } from '@/modules/types';

const adminMenuSeed = demoMenuSeedBySubsystem.admin;
if (!adminMenuSeed) throw new Error('missing admin demo menu seed');

export const adminManifest: SubsystemManifest = {
  subsystem: {
    key: 'admin',
    label: { 'zh-CN': '系统管理', 'en-US': 'System' },
    desc: { 'zh-CN': '账号、组织、角色权限与菜单的统一维护入口', 'en-US': 'Accounts · Org · IAM · Menus' },
    icon: 'settings',
    color: '#3370ff',
    home: '/admin/dashboard',
    cardLayout: 'stacked',
    builtin: true,
    enabled: true,
    sort: 1,
    origin: 'catalog',
    runtimeManaged: false,
  },
  menuSeed: adminMenuSeed,
};
