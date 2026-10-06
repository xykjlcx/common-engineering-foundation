import { eq } from 'drizzle-orm';
import type { TxCtx } from '../../../kernel/context.js';
import { BizError, PermissionError } from '../../../kernel/errors.js';
import { assertDepartmentAssignable } from '../../dept/api.js';
import { assertPostAssignable } from '../../post/api.js';
import { appUsers } from '../schema.js';
import { visibleUsers } from '../scoped.js';
import { getRoleIdsOfUser } from './user-access.js';
import { assertGrantScopeAllowed } from './user-grants.js';

/** 普通资料入口也必须检查关联事实，不能靠外键把无效选择降成500。 */
export async function assertProfileReferences(
  ctx: TxCtx,
  patch: { deptId?: string | null; managerId?: string | null; postId?: string | null },
  targetId?: string,
): Promise<void> {
  if (patch.postId !== undefined) {
    const [current] = targetId ? await visibleUsers(ctx, { where: eq(appUsers.id, targetId) }).limit(1) : [];
    if (!current || current.postId !== patch.postId) await assertPostAssignable(ctx.db, patch.postId);
  }
  if (patch.deptId !== undefined) {
    await assertDepartmentAssignable(ctx.db, patch.deptId);
    if (!ctx.isSuperuser && ctx.scope !== 'all') {
      if (ctx.scope === 'own' || patch.deptId === null || !ctx.scope.unitIds.includes(patch.deptId)) {
        throw new PermissionError({ reason: 'department_out_of_scope' });
      }
    }
    if (targetId)
      await assertGrantScopeAllowed(ctx, await getRoleIdsOfUser(ctx.db, targetId), {
        id: targetId,
        deptId: patch.deptId,
      });
  }
  if (patch.managerId) {
    if (patch.managerId === targetId) throw new BizError('user.manager_self_forbidden');
    const [manager] = await visibleUsers(ctx, { where: eq(appUsers.id, patch.managerId) }).limit(1);
    if (!manager || manager.status !== 'active') throw new BizError('user.manager_not_found');
  }
}
