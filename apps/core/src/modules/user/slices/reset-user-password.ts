import { assertPasswordPolicy } from '../../settings/api.js';
import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { hashPassword } from '../../../kernel/crypto.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import { rotatePasswordInTransaction } from '../domain/user-credentials.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { appUsers } from '../schema.js';
import { visibleUsers } from '../scoped.js';
import { PermissionError, BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/{id}/password-reset', summary: '重置用户口令（旧登录态整体失效）' },
  meta: {
    perm: USER_PERMS.resetPassword,
  },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    id: z.uuid(),

    // 上限不是形式：口令长度直通 argon2，无上限时一个超长串就是一次可放大的 CPU 消耗
    password: z.string().min(8).max(128),
    version: z.number().int().min(0),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid(),
  version: z.number().int(),
  updatedAt: z.iso.datetime(),
  revokedSessions: z.number().int(),
});

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.not_found', 'user.system_admin_protected', 'user.version_conflict']),
};
// 改密与吊销旧会话同事务，避免密码已改而旧登录仍有效。

export const resetUserPassword = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [target] = await visibleUsers(ctx, { where: eq(appUsers.id, input.id) }).limit(1);
    if (!target) throw new BizError('user.not_found', { id: input.id });
    if (target.version !== input.version) throw new BizError('user.version_conflict', { id: input.id });

    // 管理员口令仅本人可重置；拒绝属于安全事件，使用 PermissionError 留痕。
    if (target.isSystemAdmin && target.id !== ctx.userId) {
      throw new PermissionError({ id: input.id }, 'user.system_admin_protected');
    }

    await assertPasswordPolicy(ctx.db, input.password);
    // argon2 纯计算放事务外，避免长时间占用连接。
    const passwordHash = await hashPassword(input.password);
    const result = await runCommand(ctx, async (txCtx) => {
      const rotation = await rotatePasswordInTransaction(txCtx, {
        id: input.id,
        version: input.version,
        passwordHash,
      });
      if (!rotation) {
        // 复查带同一 scope 且走 tx（裸 ID 复查 = 存在性探测通道；经 ctx.db 复查 = PGlite 死锁）
        const [again] = await visibleUsers(txCtx, { where: eq(appUsers.id, input.id) }).limit(1);
        throw again
          ? new BizError('user.version_conflict', { id: input.id })
          : new BizError('user.not_found', { id: input.id });
      }
      const { updated, revokedSessions } = rotation;
      ctx.audit.capture({
        objectType: 'user',
        objectId: updated.id,
        before: null,
        // 审计键使用业务事实名，避免命中凭据脱敏规则后丢失可读含义。
        after: { rotated: true, revokedSessions },
      });
      const result = {
        id: updated.id,
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString(),
        revokedSessions,
      };
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse(result);
    });
    return result;
  });
