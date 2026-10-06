import { coreDb } from './kernel/db.js';
import { BizError, KERNEL_ERROR_CODES } from './kernel/errors.js';
import type { PrincipalLoader } from './kernel/middleware.js';
import { collectDeclaredBusinessPerms } from './kernel/procedures.js';
import { getPermCodesOfRoles, resolveRoleScope } from './modules/role/api.js';
import { getAuthUserById, getRoleIdsOfUser } from './modules/user/api.js';

// 每请求重装主体，使授权撤销和账号禁用立即生效；缓存需有同步失效机制。

export function createIamPrincipalLoader(routerForPerms: unknown): PrincipalLoader {
  // 可运行能力来自装配根 router；与角色授出的权限码分开，目录中的示例码不代表后端已实现。
  let adminPerms: ReadonlySet<string> | null = null;
  const allBusinessPerms = (): ReadonlySet<string> =>
    (adminPerms ??= collectDeclaredBusinessPerms(routerForPerms));

  return {
    async load(session, clock, permission = 'none') {
      const db = coreDb();
      const user = await getAuthUserById(db, session.userId);

      if (!user || user.status !== 'active' || (user.effectiveAt !== null && user.effectiveAt > clock.now()))
        throw new BizError(KERNEL_ERROR_CODES.SESSION_INVALID);
      const restriction = user.mustChangePassword
        ? {
            allowedActions: new Set([
              'auth.me',
              'auth.logout',
              'auth.changePassword',
              'settings.constraints',
            ]),
            errorCode: 'auth.password_change_required',
          }
        : undefined;
      if (user.isSystemAdmin)
        return {
          ...(restriction ? { restriction } : {}),
          scope: 'all' as const,
          isSuperuser: true,
          permissions: allBusinessPerms(),
          availablePermissions: allBusinessPerms(),
        };
      // 当前操作的数据范围按参与授权的角色合并；权限码保持角色链事实，可运行能力另行判断。
      const roleIds = await getRoleIdsOfUser(db, user.id);
      return {
        ...(restriction ? { restriction } : {}),
        scope:
          permission === 'none' ? ('own' as const) : await resolveRoleScope(db, roleIds, permission, user),
        permissions: new Set(await getPermCodesOfRoles(db, roleIds)),
        availablePermissions: allBusinessPerms(),
      };
    },
  };
}
