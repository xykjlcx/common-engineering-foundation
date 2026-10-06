import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import { revokeByUser } from '../../../kernel/session.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { EmploymentStatusSchema } from '../contract.js';
import { appUsers } from '../schema.js';
import { changeEmploymentScoped, visibleUsers } from '../scoped.js';
import { PermissionError, BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/{id}/employment', summary: '人员状态变更与显式返聘' },
  meta: { perm: USER_PERMS.changeStatus },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().min(0),
    action: z.enum(['set', 'rehire']),
    status: EmploymentStatusSchema,
  })
  .strict();

const outputSchema = z.object({ id: z.uuid(), version: z.number().int() });

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, [
    'user.employment_transition_invalid',
    'user.not_found',
    'user.rehire_required',
    'user.version_conflict',
  ]),
};

export const changeUserEmployment = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const change = await runCommand(ctx, async (commandCtx) => {
      const tx = commandCtx.db;
      const txCtx = commandCtx;
      const [target] = await visibleUsers(txCtx, { where: eq(appUsers.id, input.id) }).limit(1);
      if (!target) throw new BizError('user.not_found');
      if (target.version !== input.version) throw new BizError('user.version_conflict');
      if (target.isSystemAdmin || target.id === ctx.userId)
        throw new PermissionError({ reason: 'protected_lifecycle_target' });
      if (target.employmentStatus === 'left' && input.action !== 'rehire')
        throw new BizError('user.rehire_required');
      if (input.action === 'rehire' && (target.employmentStatus !== 'left' || input.status === 'left'))
        throw new BizError('user.employment_transition_invalid');
      const [updated] = await changeEmploymentScoped(ctx, tx, { ...input, employmentStatus: input.status });
      if (!updated) throw new BizError('user.version_conflict');
      if (input.status === 'left') await revokeByUser(tx, ctx.clock, input.id);
      const response = {
        result: { id: updated.id, version: updated.version },
        audit: {
          objectType: 'user',
          objectId: updated.id,
          before: { employmentStatus: target.employmentStatus, status: target.status },
          after: { employmentStatus: updated.employmentStatus, status: updated.status, action: input.action },
        },
      };
      response.result = outputSchema.parse(response.result);
      return response;
    });

    ctx.audit.capture(change.audit);
    return change.result;
  });
