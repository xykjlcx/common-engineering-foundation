import { and, eq, inArray } from 'drizzle-orm';
import type { DbExec } from '../../../kernel/context.js';
import { BizError } from '../../../kernel/errors.js';
import { getPermCodesOfMenus } from '../../menu/api.js';
import { menus } from '../../menu/schema.js';
import { roleDepts, roleMenus, roles } from '../schema.js';
import { roleDepartmentIds, selectExistingRoleIds, selectMenuIdsOfRoles } from '../store.js';

/** 空集合表示清空角色；缺失角色按稳定顺序报告。 */
export async function assertRolesExist(db: DbExec, roleIds: readonly string[]): Promise<void> {
  const wanted = [...new Set(roleIds)];
  if (wanted.length === 0) return;
  const rows = await selectExistingRoleIds(db, wanted);
  const found = new Set(rows.map((r) => r.id));
  const missing = wanted.filter((id) => !found.has(id)).sort();
  if (missing.length > 0) throw new BizError('role.not_found', { missing });
}

/** 角色只解析菜单引用；发码规则由 menu 模块负责，不存在的角色忽略。 */
export async function getPermCodesOfRoles(db: DbExec, roleIds: readonly string[]): Promise<string[]> {
  const wanted = [...new Set(roleIds)];
  if (wanted.length === 0) return [];
  const enabled = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(inArray(roles.id, wanted), eq(roles.enabled, true)));
  const effective = enabled.map((row) => row.id);
  if (effective.length === 0) return [];
  const rows = await selectMenuIdsOfRoles(db, effective);
  return getPermCodesOfMenus(
    db,
    rows.map((r) => r.menuId),
  );
}

export async function getRoleAccessSummary(db: DbExec, roleIds: readonly string[]) {
  if (!roleIds.length) return { effectivePermissions: [], scopeSources: [], subsystemKeys: [] };
  const effective = await db
    .select({ roleId: roles.id, scope: roles.dataScope, deptIds: roleDepartmentIds })
    .from(roles)
    .where(and(inArray(roles.id, [...roleIds]), eq(roles.enabled, true)));
  if (!effective.length) return { effectivePermissions: [], scopeSources: [], subsystemKeys: [] };
  const links = await db
    .select({ subsystemKey: menus.subsystemKey })
    .from(roleMenus)
    .innerJoin(menus, eq(roleMenus.menuId, menus.id))
    .where(
      inArray(
        roleMenus.roleId,
        effective.map((row) => row.roleId),
      ),
    );
  return {
    effectivePermissions: await getPermCodesOfRoles(
      db,
      effective.map((row) => row.roleId),
    ),
    scopeSources: effective.sort((a, b) => a.roleId.localeCompare(b.roleId)),
    subsystemKeys: [...new Set(links.map((row) => row.subsystemKey))].sort(),
  };
}

export async function listTemplateRoles(db: DbExec, ids?: readonly string[]) {
  if (ids && !ids.length) return [];
  return db
    .select({ id: roles.id, name: roles.name, enabled: roles.enabled })
    .from(roles)
    .where(ids ? inArray(roles.id, [...new Set(ids)]) : undefined)
    .orderBy(roles.name, roles.id);
}

export async function getOrganizationRoleReferences(db: DbExec, deptId: string) {
  return db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .innerJoin(roleDepts, eq(roleDepts.roleId, roles.id))
    .where(eq(roleDepts.deptId, deptId))
    .orderBy(roles.name, roles.id);
}
