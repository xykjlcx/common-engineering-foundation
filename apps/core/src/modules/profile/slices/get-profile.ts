import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { getOwnProfile } from '../../user/api.js';
import { ProfileViewSchema } from '../contract.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../../user/errors.js';

const definition = {
  route: { method: 'GET', path: '/profile', summary: '读取本人资料' },
  meta: {
    perm: 'none',
    permNoneReason: '仅回显ctx.userId本人资料，不接受目标用户入参',
  },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = ProfileViewSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.not_found']),
};

export const getProfile = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(({ context: ctx }) => {
    const result = getOwnProfile(ctx);
    return result;
  });
