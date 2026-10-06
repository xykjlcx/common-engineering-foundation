import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { MessageViewSchema } from '../contract.js';
import { messageView } from '../domain/view.js';
import { pendingMessages } from '../scoped.js';

const definition = {
  route: { method: 'GET', path: '/messages/pending', summary: '查询本人待确认公告' },
  meta: { perm: 'none', permNoneReason: '登录用户仅可操作自己的收件箱与通知偏好' },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.array(MessageViewSchema);

const errors = commonErrorContracts;

export const pending = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    return (await pendingMessages(ctx)).map(messageView);
  });
