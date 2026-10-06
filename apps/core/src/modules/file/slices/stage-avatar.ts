import { readSettings } from '../../settings/api.js';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { USER_PERMS } from '../../user/api.js';
import { validateAvatar } from '../domain/avatar.js';
import { files } from '../schema.js';
import { writeAvatarObject } from '../storage.js';
import { PermissionError, BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { fileErrors } from '../errors.js';

const definition = {
  route: { method: 'POST', path: '/files/avatars', summary: '暂存用户头像' },
  meta: {
    perm: 'none',
    permNoneReason: '已认证；handler 校验用户创建或修改权限之一',
    anyOf: [USER_PERMS.create, USER_PERMS.update],
    multipart: true,
  },
} satisfies SliceDefinition;

const inputSchema = z.object({ file: z.file() }).strict();

const outputSchema = z.object({ fileId: z.uuid() }).strict();

const errors = {
  ...commonErrorContracts,
  ...pick(fileErrors, ['file.avatar.not_found', 'file.avatar_invalid', 'file.storage.invalid_key']),
};

export const stageAvatar = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    if (!ctx.isSuperuser && !definition.meta.anyOf.some((perm) => ctx.permissions.has(perm)))
      throw new PermissionError();
    const settings = await readSettings(ctx.db);
    const extension = await validateAvatar(input.file, settings.values.uploads.avatarMaxMiB * 1024 * 1024);
    const fileId = ctx.idgen();
    const storageKey = `${randomUUID()}.${extension}`;
    await ctx.db.insert(files).values({
      id: fileId,
      ownerId: ctx.userId,
      storageKey,
      mimeType: input.file.type,
      byteSize: input.file.size,
      createdAt: ctx.clock.now(),
    });

    // staging 先独立提交作崩溃锚点。随后锁住单个对象完成 配置上限内的本地写入，
    // 本形态只对本地卷成立；远程对象存储须把写移出事务、用 staging 状态 + 清理补偿。

    // 与清理/绑定串行：若清理先认领，延迟恢复的上传者不得重新落盘或复活状态。
    try {
      await runCommand(ctx, async (txCtx) => {
        const tx = txCtx.db;
        const [current] = await tx
          .select({ status: files.status })
          .from(files)
          .where(eq(files.id, fileId))
          .for('update')
          .limit(1);
        if (current?.status !== 'staging') throw new BizError('file.avatar.not_found');
        await writeAvatarObject(storageKey, input.file);
        await tx
          .update(files)
          .set({ status: 'staged', stagedAt: ctx.clock.now() })
          .where(eq(files.id, fileId));
      });
    } catch (error) {
      await ctx.db
        .update(files)
        .set({ status: 'failed' })
        .where(and(eq(files.id, fileId), eq(files.status, 'staging')));
      throw error;
    }

    ctx.audit.capture({
      objectType: 'file',
      objectId: fileId,
      after: { purpose: 'avatar', status: 'staged', byteSize: input.file.size },
    });
    return { fileId };
  });
