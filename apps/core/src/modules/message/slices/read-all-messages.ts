import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { runCommand } from '../../../kernel/command.js';
import { readAllMessages } from '../scoped.js';

const definition = {
  route: { method: 'POST', path: '/messages/read-all', summary: '将本人收件箱全部标为已读' },
  meta: { perm: 'none', permNoneReason: '登录用户仅可操作自己的收件箱与通知偏好' },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.object({ count: z.number().int().nonnegative() });

const errors = commonErrorContracts;

export const readAll = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    // version豁免：个人已读、归档与偏好为幂等状态设置，首次阅读与确认时间只记录一次。
    return runCommand(ctx, (txCtx) => readAllMessages(txCtx));
  });
