import { eq } from 'drizzle-orm';
import type { TxCtx } from '../../../kernel/context.js';
import { BizError, PermissionError } from '../../../kernel/errors.js';
import { assertNoPrivilegeEscalation, assertNotGrantingSelf } from '../../../kernel/escalation.js';
import { assertPermission } from '../../../kernel/middleware.js';
import { assertRolesExist, getPermCodesOfRoles, resolveRoleScope, scopeContains } from '../../role/api.js';
import { appUsers } from '../schema.js';
import {
  grantUserRolesScoped,
  isRoleGrantMissingRoleViolation,
  revokeUserRolesScoped,
  roleIdsOfUserRaw,
  visibleUsers,
} from '../scoped.js';
import { getAuthUserById } from './user-credentials.js';
import { getRoleIdsOfUser } from './user-access.js';
import { USER_PERMS } from '../permissions.js';

/** 授权唯一写入口：创建、编辑与批量调用同一事务能力，不能只复用插入而遗漏校验。 */
export async function replaceUserRoles(ctx: TxCtx, targetId: string, requestedRoleIds: readonly string[]) {
  const roleIds = [...new Set(requestedRoleIds)].sort();
  assertPermission(USER_PERMS.assignRoles, ctx.permissions);
  const [target] = await visibleUsers(ctx, { where: eq(appUsers.id, targetId) }).limit(1);
  if (!target) throw new BizError('user.not_found', { id: targetId });
  assertNotGrantingSelf(ctx.userId, targetId);
  await assertAssignmentTargetScope(ctx, target);
  await assertRolesExist(ctx.db, roleIds);
  if (target.isSystemAdmin) throw new PermissionError({ id: targetId }, 'user.system_admin_protected');
  assertNoPrivilegeEscalation(
    ctx.isSuperuser ? { kind: 'all' } : { kind: 'set', codes: ctx.permissions },
    await getPermCodesOfRoles(ctx.db, roleIds),
  );
  await assertGrantScopeAllowed(ctx, roleIds, target);
  const beforeRoleIds = await roleIdsOfUserRaw(ctx.db, targetId);
  // 替换的是当前集合，不重写未变关系的授予事实。撤销后重授才创建新的来源/时间。
  const previousIds = new Set(beforeRoleIds);
  const requestedIds = new Set(roleIds);
  const removed = beforeRoleIds.filter((id) => !requestedIds.has(id));
  const added = roleIds.filter((id) => !previousIds.has(id));
  if (removed.length > 0) await revokeUserRolesScoped(ctx.db, targetId, removed);
  if (added.length > 0) {
    await grantUserRolesScoped(ctx, ctx.db, targetId, added).catch((error: unknown) => {
      if (isRoleGrantMissingRoleViolation(error))
        throw new BizError('user.role_grant_conflict', { id: targetId });
      throw error;
    });
  }
  return { beforeRoleIds, roleIds };
}

/** 创建、授角色和人员迁移共用目标相对范围校验。 */
export async function assertGrantScopeAllowed(
  ctx: TxCtx,
  roleIds: readonly string[],
  target: { id: string; deptId: string | null },
): Promise<void> {
  if (ctx.isSuperuser) return;
  const actor = await getAuthUserById(ctx.db, ctx.userId);
  if (!actor) throw new PermissionError();
  const actorRoles = await getRoleIdsOfUser(ctx.db, ctx.userId);
  for (const permission of await getPermCodesOfRoles(ctx.db, roleIds)) {
    const allowed = await resolveRoleScope(ctx.db, actorRoles, permission, actor);
    const requested = await resolveRoleScope(ctx.db, roleIds, permission, target);
    if (!scopeContains(allowed, actor, requested, target)) {
      throw new PermissionError(
        { permission, id: target.id, reason: 'grant_scope_exceeded' },
        'permission.escalation_denied',
      );
    }
  }
}

/** 嵌入创建/编辑/导入时，仍以授权操作自身的数据范围判目标，不能沿用外层操作范围。 */
export async function assertAssignmentTargetScope(
  ctx: TxCtx,
  target: { id: string; deptId: string | null },
): Promise<void> {
  if (ctx.isSuperuser) return;
  const actor = await getAuthUserById(ctx.db, ctx.userId);
  if (!actor) throw new PermissionError();
  const scope = await resolveRoleScope(
    ctx.db,
    await getRoleIdsOfUser(ctx.db, actor.id),
    USER_PERMS.assignRoles,
    actor,
  );
  if (!scopeContains(scope, actor, { kind: 'scoped', ids: [target.id], unitIds: [] }, target)) {
    throw new PermissionError({ reason: 'assignment_scope_exceeded' }, 'permission.escalation_denied');
  }
}
