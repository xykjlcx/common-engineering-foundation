import { runCommand } from '../../../kernel/command.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { previewNewUsers } from '../domain/user-import.js';
import { UserImportInputSchema, UserImportPreviewSchema } from '../import-contract.js';
import { commonErrorContracts, kernelErrors, pick } from '../../../kernel/errors.js';
import { deptErrors } from '../../dept/errors.js';
import { fileErrors } from '../../file/errors.js';
import { roleErrors } from '../../role/errors.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: {
    method: 'POST',
    path: '/users/import/preview',
    summary: '用户导入只读预检',
  },
  meta: { perm: USER_PERMS.import },
} satisfies SliceDefinition;

const inputSchema = UserImportInputSchema;

const outputSchema = UserImportPreviewSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(deptErrors, ['dept.disabled', 'dept.not_found']),
  ...pick(fileErrors, ['file.avatar.not_found']),
  ...pick(kernelErrors, ['permission.escalation_denied']),
  ...pick(roleErrors, ['role.not_found']),
  ...pick(userErrors, [
    'user.email_conflict',
    'user.employee_no_conflict',
    'user.manager_not_found',
    'user.manager_self_forbidden',
    'user.username_conflict',
  ]),
};

export const previewImport = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const result = await runCommand(ctx, async (txCtx) => {
      const preview = await previewNewUsers(txCtx, input.rows);
      return outputSchema.parse({ valid: preview.valid, rows: preview.rows });
    });
    return result;
  });
