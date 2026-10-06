import { eq } from 'drizzle-orm';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { getUserLoginPage } from '../../auth/api.js';
import { UserLoginLogPageSchema, UserLoginLogQuerySchema } from '../contract.js';
import { appUsers } from '../schema.js';
import { visibleUsers } from '../scoped.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/users/{id}/login-logs', summary: '用户登录记录分页' },
  meta: { perm: USER_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = UserLoginLogQuerySchema;

const outputSchema = UserLoginLogPageSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.not_found']),
};

export const queryUserLoginLogs = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [user] = await visibleUsers(ctx, { where: eq(appUsers.id, input.id) }).limit(1);
    if (!user) throw new BizError('user.not_found', { id: input.id });
    const result = await getUserLoginPage(ctx.db, user, input);

    const response = UserLoginLogPageSchema.parse({
      ...result,
      list: result.list.map((row) => ({ ...row, at: row.at.toISOString() })),
    });
    return response;
  });
