import { effectiveSessionSummary } from '../../../kernel/session.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BizError, commonErrorContracts, KERNEL_ERROR_CODES } from '../../../kernel/errors.js';
import {
  countVisibleUsersWithoutRole,
  getAuthUserById,
  getRoleIdsOfUser,
  USER_PERMS,
} from '../../user/api.js';
import { resolveRoleScope } from '../../role/api.js';
import { AUDIT_PERMS } from '../../audit/api.js';
import { DEPT_PERMS } from '../../dept/api.js';
import { OverviewInputSchema, OverviewSchema } from '../contract.js';
import { auditSummary, deptsWithoutLeader, previousLogin } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/dashboard/overview', summary: '按权限返回首页运营概览' },
  meta: { perm: 'none', permNoneReason: '每个区块在切片内按调用者权限判定，无权限的区块不返回' },
} satisfies SliceDefinition;
const inputSchema = OverviewInputSchema;
const outputSchema = OverviewSchema;
const errors = commonErrorContracts;

export const queryOverview = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③：用户指标单独解析 user.view 范围；会话、日志、部门均沿用已授权管理接口口径。
    const now = ctx.clock.now();
    const allowed = (permission: string) => ctx.permissions.has(permission);
    const audit = allowed(AUDIT_PERMS.logView) ? await auditSummary(ctx.db, now, input.timeZone) : undefined;
    let usersWithoutRole: number | undefined;
    if (allowed(USER_PERMS.view)) {
      const user = await getAuthUserById(ctx.db, ctx.userId);
      if (!user) throw new BizError(KERNEL_ERROR_CODES.SESSION_INVALID);
      const scope = ctx.isSuperuser
        ? 'all'
        : await resolveRoleScope(ctx.db, await getRoleIdsOfUser(ctx.db, ctx.userId), USER_PERMS.view, user);
      usersWithoutRole = await countVisibleUsersWithoutRole({ ...ctx, scope });
    }
    const attention = {
      ...(audit ? { lockedAccounts: audit.lockedAccounts } : {}),
      ...(usersWithoutRole !== undefined ? { usersWithoutRole } : {}),
      ...(allowed(DEPT_PERMS.view) ? { deptsWithoutLeader: await deptsWithoutLeader(ctx.db) } : {}),
    };
    return outputSchema.parse({
      timeZone: input.timeZone,
      generatedAt: now.toISOString(),
      lastLogin: await previousLogin(ctx),
      ...(allowed(AUDIT_PERMS.sessionView) ? { sessions: await effectiveSessionSummary(ctx.db, now) } : {}),
      ...(audit
        ? { loginsToday: audit.loginsToday, trend: audit.trend, recentChanges: audit.recentChanges }
        : {}),
      ...(Object.keys(attention).length ? { attention } : {}),
    });
  });
