import { assertPasswordPolicy } from '../../settings/api.js';
import { ChangePasswordInputSchema } from '../contract.js';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { hashPassword, verifyPassword } from '../../../kernel/crypto.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import { SESSION_COOKIE } from '../../../kernel/session.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { changeOwnPassword, verifyCurrentPassword } from '../../user/api.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { authErrors } from '../errors.js';
import { userErrors } from '../../user/errors.js';
import { deliverSystemMessage } from '../../message/api.js';

const definition = {
  route: { method: 'POST', path: '/auth/password', summary: '更换本人密码并退出所有会话' },
  meta: {
    perm: 'none',
    permNoneReason: '本人提供当前口令更换自己的凭据，强制改密时允许此动作',
  },
} satisfies SliceDefinition;

const inputSchema = ChangePasswordInputSchema;

const outputSchema = z.object({ changed: z.literal(true), revokedSessions: z.number().int() });

const errors = {
  ...commonErrorContracts,
  ...pick(authErrors, ['auth.password_unchanged', 'auth.current_password_invalid']),
  ...pick(userErrors, ['user.version_conflict']),
};

export const changePassword = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    await assertPasswordPolicy(ctx.db, input.newPassword);
    const verified = await verifyCurrentPassword(ctx, input.currentPassword);
    if (await verifyPassword(verified.passwordHash, input.newPassword))
      throw new BizError('auth.password_unchanged');
    const passwordHash = await hashPassword(input.newPassword);
    const revokedSessions = await runCommand(ctx, async (txCtx) => {
      const count = await changeOwnPassword(txCtx, verified.version, passwordHash);
      await deliverSystemMessage(txCtx, {
        recipientId: ctx.userId,
        title: '登录密码已修改',
        content: '你的登录密码已成功修改，所有会话已退出。若非本人操作，请联系管理员。',
      });
      return count;
    });
    ctx.cookies.clear(SESSION_COOKIE);

    ctx.audit.capture({
      objectType: 'user',
      objectId: ctx.userId,
      after: { rotated: true, revokedSessions },
    });
    return { changed: true, revokedSessions };
  });
