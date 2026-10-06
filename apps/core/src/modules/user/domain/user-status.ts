import { eq } from 'drizzle-orm';
import * as z from 'zod';
import type { TxCtx } from '../../../kernel/context.js';
import { BizError, PermissionError } from '../../../kernel/errors.js';
import { revokeByUser } from '../../../kernel/session.js';
import { appUsers, UserStatusSchema } from '../schema.js';
import { changeUserStatusScoped, visibleUsers } from '../scoped.js';

export const ChangeableStatusSchema = z.enum(['active', 'disabled']);
export const StatusResultSchema = z.object({
  id: z.uuid(),
  status: UserStatusSchema,
  version: z.number().int(),
  updatedAt: z.iso.datetime(),
});

/** 单项与批量共用业务规则；调用者提供事务，状态、会话、事件一起提交或回滚。 */
export async function changeStatusInTransaction(
  ctx: TxCtx,
  input: { id: string; version: number; status: z.infer<typeof ChangeableStatusSchema> },
) {
  const [target] = await visibleUsers(ctx, { where: eq(appUsers.id, input.id) }).limit(1);
  if (!target) throw new BizError('user.not_found', { id: input.id });
  if (target.version !== input.version) throw new BizError('user.version_conflict', { id: input.id });
  if (target.id === ctx.userId) throw new BizError('user.status_self_forbidden', { id: input.id });
  if (target.isSystemAdmin) throw new PermissionError({ id: input.id }, 'user.system_admin_protected');
  if (target.employmentStatus === 'left') throw new BizError('user.status_left_immutable', { id: input.id });
  const [updated] = await changeUserStatusScoped(ctx, ctx.db, input);
  if (!updated) {
    const [again] = await visibleUsers(ctx, { where: eq(appUsers.id, input.id) }).limit(1);
    throw new BizError(again ? 'user.version_conflict' : 'user.not_found', { id: input.id });
  }
  if (updated.status === 'disabled') await revokeByUser(ctx.db, ctx.clock, updated.id);
  return {
    result: {
      id: updated.id,
      status: UserStatusSchema.parse(updated.status),
      version: updated.version,
      updatedAt: updated.updatedAt.toISOString(),
    },
    audit: {
      objectType: 'user',
      objectId: updated.id,
      before: { status: target.status },
      after: { status: updated.status },
    },
  };
}
