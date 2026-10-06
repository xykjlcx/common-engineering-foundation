import { z } from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { CredentialSettingsSchema, UploadSettingsSchema } from '../contract.js';
import { readSettings } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/settings/constraints', summary: '当前密码和头像输入要求' },
  meta: {
    perm: 'none',
    permNoneReason: '已认证用户填写密码与头像时需要知道当前输入要求；不暴露登录限速及会话配置',
  },
} satisfies SliceDefinition;
const inputSchema = z.object({}).strict();
const outputSchema = z
  .object({ credentials: CredentialSettingsSchema, uploads: UploadSettingsSchema })
  .strict();
const errors = { ...commonErrorContracts };
export const settingsConstraints = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    const { values } = await readSettings(ctx.db);
    return { credentials: values.credentials, uploads: values.uploads };
  });
