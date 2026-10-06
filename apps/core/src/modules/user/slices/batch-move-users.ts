import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { MoveUsersSchema } from '../batch-contract.js';
import { previewUserMove } from '../domain/user-move.js';
import { assertProfileReferences } from '../domain/user-profile.js';
import { appUsers } from '../schema.js';
import { updateUserScoped, visibleUsers } from '../scoped.js';
import {
  PermissionError,
  BizError,
  commonErrorContracts,
  kernelErrors,
  pick,
} from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { deptErrors } from '../../dept/errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/batch/department', summary: '原子调整部门并检查目标相对授权范围' },
  meta: {
    perm: USER_PERMS.move,
  },
} satisfies SliceDefinition;

const inputSchema = MoveUsersSchema;

const outputSchema = z.object({ items: z.array(z.object({ id: z.uuid(), version: z.number().int() })) });

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, [
    'user.not_found',
    'user.version_conflict',
    'user.manager_not_found',
    'user.manager_self_forbidden',
  ]),
  ...pick(deptErrors, ['dept.disabled', 'dept.not_found']),
  ...pick(deptErrors, ['dept.impact_changed']),
  ...pick(kernelErrors, ['permission.escalation_denied']),
};

export const batchMoveUsers = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const result = await runCommand(ctx, async (commandCtx) => {
      const tx = commandCtx.db;
      const impact = await previewUserMove(commandCtx, input);
      if (
        (impact.companyChangeCount > 0 || input.impactFingerprint !== undefined) &&
        input.impactFingerprint !== impact.fingerprint
      )
        throw new BizError('dept.impact_changed');
      const txCtx = commandCtx,
        changes = [];
      for (const target of input.targets) {
        const [before] = await visibleUsers(txCtx, { where: eq(appUsers.id, target.id) }).limit(1);
        if (!before) throw new BizError('user.not_found');
        if (before.id === ctx.userId || before.isSystemAdmin)
          throw new PermissionError({ reason: 'protected_department_target' });
        if (before.version !== target.version) throw new BizError('user.version_conflict');
        await assertProfileReferences(txCtx, { deptId: input.deptId }, target.id);
        const [updated] = await updateUserScoped(ctx, tx, { ...target, set: { deptId: input.deptId } });
        if (!updated) throw new BizError('user.version_conflict');
        changes.push({
          result: { id: updated.id, version: updated.version },
          audit: {
            objectType: 'user',
            objectId: target.id,
            before: { deptId: before.deptId },
            after: { deptId: updated.deptId },
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
