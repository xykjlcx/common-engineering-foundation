// 运行时精确匹配，与 ADR-010 决策二及后端 permissions.has(perm) 对齐。
// 通配只允许出现在授权配置层并在进入 principal 前展开；前端不解释 `*`。
export interface AuthzContext {
  permissions: string[];
  systemAdmin: boolean;
}

export function authzContext(permissions: string[], systemAdmin = false): AuthzContext {
  return { permissions, systemAdmin };
}

export function matchPermission(authz: AuthzContext, need: string): boolean {
  if (authz.systemAdmin) return true;
  return authz.permissions.includes(need);
}

export function matchDeclaredAction(authz: AuthzContext, need: string, superuserOnly = false): boolean {
  if (superuserOnly) return authz.systemAdmin;
  return matchPermission(authz, need);
}

// —— 权限降级总表（PermDegrade.dc.html「六类对象的处理」）——
// 边界声明：以下全部只是体验与防误触。前端权限不是安全边界——每一条都必须由后端再校验一次，
// 否则改个 devtools 就绕过去了。这张表存在的意义是把「同一件事三种处理」一次定死，
// 避免每个页面各自发明隐藏/置灰/跳转。
export type PermissionSubject =
  | 'highValueAction' // 破坏性与高价值操作：删除 / 审核 / 过账 / 导出全量
  | 'action' // 普通按钮
  | 'menuItem'
  | 'page'
  | 'tableColumn'
  | 'detailField';

export type PermissionDegrade =
  | 'disable' // 置灰 + 说明原因：让用户知道去找谁申请
  | 'hide' // 隐藏：避免满屏灰噪声
  | 'omitFromMenu' // 后端不下发：导航里不摆进不去的门
  | 'forbiddenPage' // 403 页：越权访问多数不是用户的错
  | 'omitColumn' // 列不出现，而不是显示成 ****
  | 'placeholder'; // 显示占位 + 锁标：字段存在这件事本身不敏感

export const permissionDegradeMap: Record<PermissionSubject, PermissionDegrade> = {
  highValueAction: 'disable',
  action: 'hide',
  menuItem: 'omitFromMenu',
  page: 'forbiddenPage',
  tableColumn: 'omitColumn',
  detailField: 'placeholder',
};
