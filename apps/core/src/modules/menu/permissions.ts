// 菜单业务权限码常量：权限码字面量只允许出现在本文件与 .meta({ perm }) 声明位（守卫 perm-code-literal）。
export const MENU_PERMS = {
  view: 'iam:menu:view',
  create: 'iam:menu:create',
  update: 'iam:menu:update',
  delete: 'iam:menu:del',
} as const;
