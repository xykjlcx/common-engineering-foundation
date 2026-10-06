import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BatchTargetsSchema } from '../batch-contract.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import {
  ChangeableStatusSchema,
  changeStatusInTransaction,
  StatusResultSchema,
} from '../domain/user-status.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/batch/status', summary: '整批启用/禁用用户（原子提交）' },
  meta: {
    perm: USER_PERMS.changeStatus,
  },
} satisfies SliceDefinition;

const inputSchema = z.object({ targets: BatchTargetsSchema, status: ChangeableStatusSchema }).strict();

const outputSchema = z.object({ items: z.array(StatusResultSchema) });

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

export const batchUserStatus = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const result = await runCommand(ctx, async (txCtx) => {
      const changes = [];
      for (const target of input.targets) {
        const changed = await changeStatusInTransaction(txCtx, { ...target, status: input.status });
        changes.push(changed);
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
