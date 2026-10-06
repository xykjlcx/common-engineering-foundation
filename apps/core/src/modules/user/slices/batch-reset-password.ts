import { readSettings } from '../../settings/api.js';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { hashPassword } from '../../../kernel/crypto.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import { rotatePasswordInTransaction } from '../domain/user-credentials.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BatchTargetsSchema } from '../batch-contract.js';
import { appUsers } from '../schema.js';
import { visibleUsers } from '../scoped.js';
import { PermissionError, BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/batch/password-reset', summary: '整批重置独立临时口令' },
  meta: {
    perm: USER_PERMS.resetPassword,
  },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    targets: BatchTargetsSchema.refine((targets) => targets.length <= 50, {
      error: '每次最多重置50个账号',
    }),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(
    z.object({ id: z.uuid(), username: z.string(), password: z.string(), version: z.number().int() }),
  ),
});

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.not_found', 'user.system_admin_protected', 'user.version_conflict']),
};

export const batchResetPassword = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // 在昂贵计算前校验全部目标，事务内条件写再兜住这之后的版本变化。
    for (const target of input.targets) {
      const [user] = await visibleUsers(ctx, { where: eq(appUsers.id, target.id) }).limit(1);
      if (!user) throw new BizError('user.not_found');
      if (user.version !== target.version) throw new BizError('user.version_conflict');
      if (user.isSystemAdmin && user.id !== ctx.userId)
        throw new PermissionError({}, 'user.system_admin_protected');
    }
    const policy = (await readSettings(ctx.db)).values.credentials;
    const length = Math.max(26, policy.minLength);
    const prepared: (z.infer<typeof BatchTargetsSchema>[number] & {
      password: string;
      passwordHash: string;
    })[] = [];
    for (const target of input.targets) {
      const password = `Aa2!${randomBytes(Math.ceil((length * 3) / 4))
        .toString('base64url')
        .slice(0, length - 4)}`;
      prepared.push({ ...target, password, passwordHash: await hashPassword(password) });
    }

    const response = await runCommand(ctx, async (txCtx) => {
      const items = [];
      for (const target of prepared) {
        const rotation = await rotatePasswordInTransaction(txCtx, target);
        if (!rotation) throw new BizError('user.version_conflict');
        const { updated } = rotation;
        items.push({
          id: updated.id,
          username: updated.username,
          password: target.password,
          version: updated.version,
        });
      }
      const result = outputSchema.parse({ items });
      return result;
    });

    ctx.audit.captureMany(
      response.items.map((item) => ({
        objectType: 'user',
        objectId: item.id,
        after: { credentialChanged: true, sessionsRevoked: true },
      })),
    );
    return response;
  });
