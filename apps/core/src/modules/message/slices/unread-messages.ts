import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { MessageUnreadSchema } from '../contract.js';
import { unreadMessages } from '../scoped.js';

const definition = {
  route: { method: 'GET', path: '/messages/unread', summary: '查询本人未读数量' },
  meta: { perm: 'none', permNoneReason: '登录用户仅可操作自己的收件箱与通知偏好' },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = MessageUnreadSchema;

const errors = commonErrorContracts;

export const unread = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    return unreadMessages(ctx);
  });
