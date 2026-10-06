import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { MessageListInputSchema, MessagePageSchema } from '../contract.js';
import { messageView } from '../domain/view.js';
import { messagePage } from '../scoped.js';

const definition = {
  route: { method: 'GET', path: '/messages', summary: '查询本人消息' },
  meta: { perm: 'none', permNoneReason: '登录用户仅可操作自己的收件箱与通知偏好' },
} satisfies SliceDefinition;

const inputSchema = MessageListInputSchema;

const outputSchema = MessagePageSchema;

const errors = commonErrorContracts;

export const listMessages = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const page = await messagePage(ctx, input);
    return { ...page, list: page.list.map(messageView), page: input.page, pageSize: input.pageSize };
  });
