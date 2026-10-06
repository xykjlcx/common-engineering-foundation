import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { runCommand } from '../../../kernel/command.js';
import { MessagePreferencesSchema } from '../contract.js';
import { saveOwnPreferences } from '../scoped.js';

const definition = {
  route: { method: 'PUT', path: '/messages/preferences', summary: '保存本人通知偏好' },
  meta: { perm: 'none', permNoneReason: '登录用户仅可操作自己的收件箱与通知偏好' },
} satisfies SliceDefinition;

const inputSchema = MessagePreferencesSchema;

const outputSchema = MessagePreferencesSchema;

const errors = commonErrorContracts;

export const savePreferences = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // version豁免：个人已读、归档与偏好为幂等状态设置，首次阅读与确认时间只记录一次。
    return runCommand(ctx, (txCtx) => saveOwnPreferences(txCtx, input.badgeEnabled));
  });
