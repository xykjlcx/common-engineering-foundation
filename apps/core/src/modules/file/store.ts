import { eq } from 'drizzle-orm';
import type { Ctx, TxCtx } from '../../kernel/context.js';
import { BizError } from '../../kernel/errors.js';
import { files } from './schema.js';

type AvatarEligibility = Pick<typeof files.$inferSelect, 'purpose' | 'status' | 'ownerId'>;

function assertStagedAvatarOwned(file: AvatarEligibility | undefined, ownerId: string): void {
  if (!file || file.purpose !== 'avatar' || file.status !== 'staged' || file.ownerId !== ownerId)
    throw new BizError('file.avatar.not_found');
}

/** 预检只读取资格；真正绑定仍在写事务持行锁后重新校验。 */
export async function assertAvatarAvailable(
  ctx: Pick<Ctx, 'db' | 'userId'>,
  fileId: string | null,
): Promise<void> {
  if (fileId === null) return;
  const [file] = await ctx.db
    .select({ purpose: files.purpose, status: files.status, ownerId: files.ownerId })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  assertStagedAvatarOwned(file, ctx.userId);
}

/** 只有上传者的完成暂存可绑定；同一目标的既有头像允许原样保留。 */
export async function bindAvatar(ctx: TxCtx, fileId: string | null, targetUserId: string): Promise<void> {
  if (fileId === null) return;
  const [file] = await ctx.db.select().from(files).where(eq(files.id, fileId)).for('update').limit(1);
  if (file?.purpose === 'avatar' && file.status === 'bound' && file.boundUserId === targetUserId) return;
  assertStagedAvatarOwned(file, ctx.userId);
  await ctx.db
    .update(files)
    .set({
      status: 'bound',
      boundUserId: targetUserId,
      boundAt: ctx.clock.now(),
    })
    .where(eq(files.id, fileId));
}

export async function findAvatar(ctx: Ctx, fileId: string) {
  const [file] = await ctx.db.select().from(files).where(eq(files.id, fileId)).limit(1);
  return file?.purpose === 'avatar' ? file : undefined;
}
