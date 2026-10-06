import type { TxCtx } from '../../../kernel/context.js';
import { PermissionError } from '../../../kernel/errors.js';
import { getPermCodesOfMenus } from '../../menu/api.js';
import { getAuthUserById, getRoleIdsOfUser, getRoleSubjects } from '../../user/api.js';
import { resolvePolicyScope, resolveRoleScope, scopeContains, type RoleScopePolicy } from './role-scope.js';

/** 角色菜单变更也影响既有成员，不能绕过用户授角色处的实际范围约束。 */
export async function assertRoleMenuScope(
  ctx: TxCtx,
  target: RoleScopePolicy & { id: string },
  menuIds: readonly string[],
): Promise<void> {
  if (ctx.isSuperuser) return;
  const actor = await getAuthUserById(ctx.db, ctx.userId);
  if (!actor) throw new PermissionError();
  const actorRoles = await getRoleIdsOfUser(ctx.db, ctx.userId);
  const subjects = await getRoleSubjects(ctx.db, target.id);
  for (const permission of await getPermCodesOfMenus(ctx.db, menuIds)) {
    const allowed = await resolveRoleScope(ctx.db, actorRoles, permission, actor);
    for (const subject of subjects) {
      const requested = await resolvePolicyScope(ctx.db, target, subject);
      if (!scopeContains(allowed, actor, requested, subject))
        throw new PermissionError(
          { permission, reason: 'grant_scope_exceeded' },
          'permission.escalation_denied',
        );
    }
  }
}
