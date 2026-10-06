import { eq, inArray } from 'drizzle-orm';
import type { DataScope, DbExec } from '../../../kernel/context.js';
import { departmentDescendants } from '../../dept/api.js';
import { menus } from '../../menu/schema.js';
import { roleMenus, roles } from '../schema.js';
import { roleColumns } from '../store.js';

export type RoleScopePolicy = Pick<typeof roles.$inferSelect, 'enabled' | 'dataScope'> & {
  deptIds: readonly string[];
};

export interface ScopeSubject {
  id: string;
  deptId: string | null;
}

/** 只并入实际持有当前操作的有效角色；枚举没有大小顺序。 */
export async function resolveRoleScope(
  db: DbExec,
  roleIds: readonly string[],
  permission: string,
  subject: ScopeSubject,
): Promise<DataScope> {
  if (roleIds.length === 0) return { kind: 'scoped', ids: [], unitIds: [] };
  const assigned = await db
    .select(roleColumns)
    .from(roles)
    .where(inArray(roles.id, [...roleIds]));
  const grants = await db
    .select({ roleId: roleMenus.roleId, code: menus.permCode })
    .from(roleMenus)
    .innerJoin(menus, eq(menus.id, roleMenus.menuId))
    .where(inArray(roleMenus.roleId, [...roleIds]));
  const ids = new Set<string>();
  const unitIds = new Set<string>();
  for (const role of assigned) {
    if (!role.enabled) continue;
    if (!grants.some((grant) => grant.roleId === role.id && grant.code === permission)) continue;
    const scope = await resolvePolicyScope(db, role, subject);
    if (scope === 'all') return 'all';
    if (scope === 'own') ids.add(subject.id);
    else {
      for (const id of scope.ids) ids.add(id);
      for (const id of scope.unitIds) unitIds.add(id);
    }
  }
  return { kind: 'scoped', ids: [...ids].sort(), unitIds: [...unitIds].sort() };
}

/** 比较的是实际主体/部门集合，不能给 self/dept/all 的枚举排序。 */
export function scopeContains(
  actor: DataScope,
  actorSubject: ScopeSubject,
  requested: DataScope,
  targetSubject: ScopeSubject,
): boolean {
  if (actor === 'all') return true;
  if (requested === 'all') return false;
  const allowedIds = new Set(actor === 'own' ? [actorSubject.id] : actor.ids);
  const allowedUnits = new Set(actor === 'own' ? [] : actor.unitIds);
  const requestedIds = requested === 'own' ? [targetSubject.id] : requested.ids;
  const requestedUnits = requested === 'own' ? [] : requested.unitIds;
  return (
    requestedUnits.every((id) => allowedUnits.has(id)) &&
    requestedIds.every(
      (id) =>
        allowedIds.has(id) ||
        (id === targetSubject.id && targetSubject.deptId !== null && allowedUnits.has(targetSubject.deptId)),
    )
  );
}

/** 变更授权菜单时，以拟授予的策略计算每个现有成员将获得的实际范围。 */
export async function resolvePolicyScope(
  db: DbExec,
  policy: RoleScopePolicy,
  subject: ScopeSubject,
): Promise<DataScope> {
  if (!policy.enabled) return { kind: 'scoped', ids: [], unitIds: [] };
  switch (policy.dataScope) {
    case 'all':
      return 'all';
    case 'self':
      return { kind: 'scoped', ids: [subject.id], unitIds: [] };
    case 'dept':
      return { kind: 'scoped', ids: [], unitIds: subject.deptId ? [subject.deptId] : [] };
    case 'deptAndChildren':
      return {
        kind: 'scoped',
        ids: [],
        unitIds: subject.deptId ? await departmentDescendants(db, [subject.deptId]) : [],
      };
    case 'custom':
      return { kind: 'scoped', ids: [], unitIds: policy.deptIds };
    default:
      return { kind: 'scoped', ids: [], unitIds: [] };
  }
}
