import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import { revokeByUser } from '../../../kernel/session.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { ChangeAccountPolicySchema } from '../contract.js';
import { appUsers } from '../schema.js';
import { changeAccountPolicyScoped, visibleUsers } from '../scoped.js';
import { PermissionError, BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/{id}/account-policy', summary: '调整账号生效时间与强制改密策略' },
  meta: {
    perm: USER_PERMS.changeStatus,
  },
} satisfies SliceDefinition;

const inputSchema = ChangeAccountPolicySchema;

const outputSchema = ChangeAccountPolicySchema.extend({ updatedAt: z.iso.datetime(), changed: z.boolean() });

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.not_found', 'user.version_conflict']),
};

export const changeAccountPolicy = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const outcome = await runCommand(ctx, async (commandCtx) => {
      const tx = commandCtx.db;
      const txCtx = commandCtx;
      const [target] = await visibleUsers(txCtx, { where: eq(appUsers.id, input.id) }).limit(1);
      if (!target) throw new BizError('user.not_found');
      if (target.id === ctx.userId || target.isSystemAdmin)
        throw new PermissionError({ reason: 'protected_lifecycle_target' });
      if (target.version !== input.version) throw new BizError('user.version_conflict');
      const effectiveAt = input.effectiveAt === null ? null : new Date(input.effectiveAt);
      const before = {
        effectiveAt: target.effectiveAt?.toISOString() ?? null,
        mustChangePassword: target.mustChangePassword,
      };
      const after = {
        effectiveAt: effectiveAt?.toISOString() ?? null,
        mustChangePassword: input.mustChangePassword,
      };
      const changed =
        before.effectiveAt !== after.effectiveAt || before.mustChangePassword !== after.mustChangePassword;
      if (!changed)
        return {
          result: outputSchema.parse({
            id: target.id,
            version: target.version,
            ...after,
            updatedAt: target.updatedAt.toISOString(),
            changed: false,
          }),
          audit: { objectType: 'user', objectId: target.id, before, after: { ...after, changed: false } },
        };
      const [updated] = await changeAccountPolicyScoped(ctx, tx, { ...input, effectiveAt });
      if (!updated) {
        const [again] = await visibleUsers(txCtx, { where: eq(appUsers.id, input.id) }).limit(1);
        throw new BizError(again ? 'user.version_conflict' : 'user.not_found');
      }
      // 新策略会改变现存登录资格时撤销旧会话；取消策略也不能恢复此前已吊销的 Cookie。
      if (
        (effectiveAt !== null && effectiveAt > ctx.clock.now()) ||
        before.mustChangePassword !== after.mustChangePassword
      ) {
        await revokeByUser(tx, ctx.clock, input.id);
      }
      const response = {
        result: outputSchema.parse({
          id: updated.id,
          version: updated.version,
          ...after,
          updatedAt: updated.updatedAt.toISOString(),
          changed: true,
        }),
        audit: { objectType: 'user', objectId: updated.id, before, after: { ...after, changed: true } },
      };
      return response;
    });

    ctx.audit.capture(outcome.audit);
    return outcome.result;
  });
