import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { MessageViewSchema } from '../contract.js';
import { messageView } from '../domain/view.js';
import { messageErrors } from '../errors.js';
import { ownMessage } from '../scoped.js';

const definition = {
  route: { method: 'GET', path: '/messages/{id}', summary: '读取本人消息详情' },
  meta: { perm: 'none', permNoneReason: '登录用户仅可操作自己的收件箱与通知偏好' },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid() }).strict();

const outputSchema = MessageViewSchema;

const errors = { ...commonErrorContracts, ...pick(messageErrors, ['message.not_found']) };

export const getMessage = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return messageView(await ownMessage(ctx, input.id));
  });
