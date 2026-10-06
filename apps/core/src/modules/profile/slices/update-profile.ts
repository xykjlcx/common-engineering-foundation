import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { updateOwnProfile } from '../../user/api.js';
import { ProfileViewSchema, UpdateOwnProfileSchema } from '../contract.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../../user/errors.js';

const definition = {
  route: {
    method: 'PATCH',
    path: '/profile',
    summary: '修改本人资料（版本校验）',
  },
  meta: {
    perm: 'none',
    permNoneReason: '只修改ctx.userId本人白名单资料，不能改职位、工号、部门和授权',
  },
} satisfies SliceDefinition;

const inputSchema = UpdateOwnProfileSchema;

const outputSchema = ProfileViewSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.not_found', 'user.version_conflict']),
};

export const updateProfile = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const result = await runCommand(ctx, async (txCtx) => {
      const changed = await updateOwnProfile(txCtx, input);
      const after = outputSchema.parse(changed.after);
      return { before: changed.before, after };
    });

    ctx.audit.capture({
      objectType: 'user',
      objectId: ctx.userId,
      before: result.before,
      after: result.after,
    });
    return result.after;
  });
