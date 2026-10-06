import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { MessagePreferencesSchema } from '../contract.js';
import { ownPreferences } from '../scoped.js';

const definition = {
  route: { method: 'GET', path: '/messages/preferences', summary: '查询本人通知偏好' },
  meta: { perm: 'none', permNoneReason: '登录用户仅可操作自己的收件箱与通知偏好' },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = MessagePreferencesSchema;

const errors = commonErrorContracts;

export const preferences = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    return ownPreferences(ctx);
  });
