import { runCommand } from '../../../kernel/command.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, kernelErrors, pick } from '../../../kernel/errors.js';
import { deptErrors } from '../../dept/errors.js';
import { MoveUsersSchema, UserMovePreviewSchema } from '../batch-contract.js';
import { previewUserMove } from '../domain/user-move.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/batch/department/preview', summary: '预览成员调动与跨公司影响' },
  meta: { perm: USER_PERMS.move },
} satisfies SliceDefinition;
const inputSchema = MoveUsersSchema;
const outputSchema = UserMovePreviewSchema;
const errors = {
  ...commonErrorContracts,
  ...pick(deptErrors, ['dept.not_found', 'dept.disabled']),
  ...pick(userErrors, [
    'user.not_found',
    'user.version_conflict',
    'user.manager_not_found',
    'user.manager_self_forbidden',
  ]),
  ...pick(kernelErrors, ['permission.escalation_denied']),
};

export const previewMoveUsers = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) =>
    runCommand(ctx, async (txCtx) => outputSchema.parse(await previewUserMove(txCtx, input))),
  );
