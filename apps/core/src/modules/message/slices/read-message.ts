import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { runCommand } from '../../../kernel/command.js';
import { MessageViewSchema } from '../contract.js';
import { messageView } from '../domain/view.js';
import { messageErrors } from '../errors.js';
import { readMessage } from '../scoped.js';

const definition = {
  route: { method: 'POST', path: '/messages/{id}/read', summary: '设置本人消息阅读状态' },
  meta: { perm: 'none', permNoneReason: '登录用户仅可操作自己的收件箱与通知偏好' },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid(), read: z.boolean() }).strict();

const outputSchema = MessageViewSchema;

const errors = { ...commonErrorContracts, ...pick(messageErrors, ['message.not_found']) };

export const setMessageRead = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // version豁免：个人已读、归档与偏好为幂等状态设置，首次阅读与确认时间只记录一次。
    return runCommand(ctx, async (txCtx) =>
      outputSchema.parse(messageView(await readMessage(txCtx, input.id, input.read))),
    );
  });
