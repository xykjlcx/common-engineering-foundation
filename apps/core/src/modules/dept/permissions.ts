// 部门业务权限码常量：权限码字面量只允许出现在本文件与 .meta({ perm }) 声明位（守卫 perm-code-literal）。
export const DEPT_PERMS = {
  view: 'iam:dept:view',
  create: 'iam:dept:create',
  update: 'iam:dept:update',
  delete: 'iam:dept:del',
} as const;
