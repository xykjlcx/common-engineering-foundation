import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import { revokeByUser } from '../../../kernel/session.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BatchTargetsSchema } from '../batch-contract.js';
import { appUsers } from '../schema.js';
import { archiveUserScoped, revokeUserRolesScoped, visibleUsers } from '../scoped.js';
import { PermissionError, BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/batch/archive', summary: '整批注销账号，保留业务历史引用' },
  meta: {
    perm: USER_PERMS.delete,
  },
} satisfies SliceDefinition;

const inputSchema = z.object({ targets: BatchTargetsSchema }).strict();

const outputSchema = z.object({ items: z.array(z.object({ id: z.uuid(), version: z.number().int() })) });

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.not_found', 'user.version_conflict']),
};

export const batchArchiveUsers = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const result = await runCommand(ctx, async (commandCtx) => {
      const tx = commandCtx.db;
      const txCtx = commandCtx;
      const changes = [];
      for (const target of input.targets) {
        const [before] = await visibleUsers(txCtx, { where: eq(appUsers.id, target.id) }).limit(1);
        if (!before) throw new BizError('user.not_found');
        if (before.isSystemAdmin || before.id === ctx.userId)
          throw new PermissionError({ reason: 'protected_lifecycle_target' });
        const [updated] = await archiveUserScoped(ctx, tx, target);
        if (!updated) throw new BizError('user.version_conflict');
        await revokeUserRolesScoped(tx, target.id);
        await revokeByUser(tx, ctx.clock, target.id);
        changes.push({
          result: { id: updated.id, version: updated.version },
          audit: {
            objectType: 'user',
            objectId: target.id,
            before: { status: before.status },
            after: { status: 'disabled', archived: true },
          },
        });
      }
      // 先验证整批响应；任何一项投影失效都不能提交前面的写入。
      const response = outputSchema.parse({ items: changes.map((change) => change.result) });
      const audits = changes.map((change) => change.audit);
      return { response, audits };
    });

    ctx.audit.captureMany(result.audits);

    const response = result.response;
    return response;
  });
