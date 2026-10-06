import { UserViewSchema } from '../contract.js';
import type { visibleUsers } from '../scoped.js';

type VisibleUser = Awaited<ReturnType<typeof visibleUsers>>[number];

/** 明确把账号开关和可空人员状态分开；不为历史缺字段伪造人员或审计事实。 */
export function userView(user: VisibleUser, roleIds: string[], lastLoginAt: Date | null) {
  const { status, isSystemAdmin, ...profile } = user;
  return UserViewSchema.parse({
    ...profile,
    avatar: user.avatarId ? `/api/v1/files/${user.avatarId}` : null,
    systemAdmin: isSystemAdmin,
    accountStatus: status === 'active' ? 'enabled' : 'disabled',
    roleIds,
    effectiveAt: user.effectiveAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: lastLoginAt?.toISOString() ?? null,
  });
}
