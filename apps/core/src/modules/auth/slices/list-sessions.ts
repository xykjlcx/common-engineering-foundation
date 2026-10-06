import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import { listOwnedSessions } from '../../../kernel/session.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { SessionListSchema } from '../../profile/contract.js';

const definition = {
  route: { method: 'GET', path: '/auth/sessions', summary: '本人有效会话' },
  meta: {
    perm: 'none',
    permNoneReason: '只列当前主体的有效会话，公开句柄独立于凭据hash',
  },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = SessionListSchema;

const errors = { ...commonErrorContracts };

export const listSessions = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    const result = {
      sessions: (
        await listOwnedSessions(ctx.db, ctx.clock, {
          userId: ctx.userId,
          principal: ctx.principal,
          currentSessionId: ctx.sessionId,
        })
      ).map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      })),
    };
    return result;
  });
