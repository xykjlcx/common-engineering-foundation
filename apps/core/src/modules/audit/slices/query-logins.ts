import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { AUDIT_PERMS } from '../permissions.js';
import { LoginQuerySchema, LoginPageSchema } from '../contract.js';
import { getGlobalLoginPage } from '../../auth/api.js';

const definition = {
  route: { method: 'GET', path: '/audit/logins', summary: '全站登录日志' },
  meta: { perm: AUDIT_PERMS.logView },
} satisfies SliceDefinition;

const inputSchema = LoginQuerySchema;
const outputSchema = LoginPageSchema;
const errors = commonErrorContracts;

export const queryLogins = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const result = await getGlobalLoginPage(ctx.db, input);

    return outputSchema.parse({
      ...result,
      list: result.list.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString() })),
    });
  });
