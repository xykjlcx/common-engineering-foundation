import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import {
  ChangeableStatusSchema,
  changeStatusInTransaction,
  StatusResultSchema,
} from '../domain/user-status.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/{id}/status', summary: '启用/禁用用户' },
  meta: { perm: USER_PERMS.changeStatus },
} satisfies SliceDefinition;

const inputSchema = z
  .object({ id: z.uuid(), status: ChangeableStatusSchema, version: z.number().int().min(0) })
  .strict();

const outputSchema = StatusResultSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, [
    'user.not_found',
    'user.status_left_immutable',
    'user.status_self_forbidden',
    'user.system_admin_protected',
    'user.version_conflict',
  ]),
};

export const changeUserStatus = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const changed = await runCommand(ctx, async (txCtx) => {
      const changed = await changeStatusInTransaction(txCtx, input);
      changed.result = outputSchema.parse(changed.result);
      return changed;
    });

    ctx.audit.capture(changed.audit);
    return changed.result;
  });
