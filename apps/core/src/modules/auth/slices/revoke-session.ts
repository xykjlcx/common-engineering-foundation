import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import { revokeOwnedSession, SESSION_COOKIE } from '../../../kernel/session.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { authErrors } from '../errors.js';

const definition = {
  route: {
    method: 'DELETE',
    path: '/auth/sessions/{handle}',
    summary: '撤销本人会话',
  },
  meta: {
    perm: 'none',
    permNoneReason: '句柄与ctx.userId+principal相交，只能撤销本人会话',
  },
} satisfies SliceDefinition;

const inputSchema = z.object({ handle: z.uuid() }).strict();

const outputSchema = z.object({ current: z.boolean() }).strict();

const errors = {
  ...commonErrorContracts,
  ...pick(authErrors, ['auth.session.not_found']),
};

export const revokeSession = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const result = await revokeOwnedSession(
      ctx.db,
      ctx.clock,
      {
        userId: ctx.userId,
        principal: ctx.principal,
        currentSessionId: ctx.sessionId,
      },
      input.handle,
    );
    if (!result) throw new BizError('auth.session.not_found');
    if (result.current) ctx.cookies.clear(SESSION_COOKIE);

    ctx.audit.capture({
      objectType: 'session',
      objectId: input.handle,
      after: { revoked: true },
    });
    return result;
  });
