import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { canReadAvatar } from '../../user/api.js';
import { findAvatar } from '../store.js';
import { readAvatarObject } from '../storage.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { fileErrors } from '../errors.js';

const definition = {
  route: { method: 'GET', path: '/files/{id}', summary: '读取可见用户头像' },
  meta: {
    perm: 'none',
    permNoneReason: '已认证用户读取本人头像；他人头像在user能力中校验查看权限与当前数据范围',
  },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid() }).strict();

const outputSchema = z.file();

const errors = {
  ...commonErrorContracts,
  ...pick(fileErrors, ['file.avatar.not_found', 'file.storage.invalid_key']),
};

export const downloadAvatar = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const file = await findAvatar(ctx, input.id);
    const readable =
      file &&
      ((file.status === 'staged' && file.ownerId === ctx.userId) ||
        (file.status === 'bound' && (await canReadAvatar(ctx, file.id))));
    if (!readable) throw new BizError('file.avatar.not_found');
    return readAvatarObject(file.storageKey, file.mimeType);
  });
