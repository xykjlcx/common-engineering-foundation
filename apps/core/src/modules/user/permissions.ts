// 用户业务权限码常量：权限码字面量只允许出现在本文件与 .meta({ perm }) 声明位（守卫 perm-code-literal）。
export const USER_PERMS = {
  view: 'iam:user:view',
  create: 'iam:user:create',
  update: 'iam:user:update',
  delete: 'iam:user:delete',
  import: 'iam:user:import',
  export: 'iam:user:export',
  move: 'iam:user:move',
  assignRoles: 'iam:user:assign_roles',
  changeStatus: 'iam:user:change_status',
  resetPassword: 'iam:user:reset_password',
} as const;
