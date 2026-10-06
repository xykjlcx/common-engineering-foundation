import { BizError, PermissionError } from '../../../kernel/errors.js';
import { RoleTypeSchema } from '../schema.js';

// 内置角色不可变是业务约束，使用 BizError 区分权限拒绝。

export function assertRoleMutable(role: { id: string; type: string }): void {
  if (RoleTypeSchema.parse(role.type) === 'system') {
    throw new BizError('role.system_protected', { id: role.id });
  }
}

export function normalizeMenuIds(menuIds: readonly string[]): string[] {
  return [...new Set(menuIds)].sort();
}

export function assertRoleCreateScopeAllowed(
  ctx: { isSuperuser: boolean },
  input: { dataScope: string; deptIds: readonly string[] },
): void {
  if (!ctx.isSuperuser && (input.dataScope !== 'self' || input.deptIds.length > 0)) {
    throw new PermissionError({ reason: 'scope_policy_requires_superuser' });
  }
}

export function assertScopePolicyChangeAllowed(
  ctx: { isSuperuser: boolean },
  input: { enabled?: boolean; dataScope?: string; deptIds?: readonly string[] },
): void {
  if (input.enabled === undefined && input.dataScope === undefined && input.deptIds === undefined) return;
  if (!ctx.isSuperuser) throw new PermissionError({ reason: 'scope_policy_requires_superuser' });
}

// 角色在用由 restrict 外键判定，避免成员数预查与删除之间的竞态。
