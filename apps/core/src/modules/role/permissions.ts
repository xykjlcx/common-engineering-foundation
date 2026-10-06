// 角色业务权限码常量：权限码字面量只允许出现在本文件与 .meta({ perm }) 声明位（守卫 perm-code-literal）。
export const ROLE_PERMS = {
  view: 'iam:role:view',
  create: 'iam:role:create',
  update: 'iam:role:update',
  delete: 'iam:role:del',
  grant: 'iam:role:grant',
} as const;
