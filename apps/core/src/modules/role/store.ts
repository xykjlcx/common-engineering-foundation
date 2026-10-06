import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Ctx, DbExec, TxExec } from '../../kernel/context.js';
import { PG_REFERENCE_VIOLATION, PG_UNIQUE_VIOLATION, violatedConstraint } from '../../kernel/pg-error.js';
import { BizError } from '../../kernel/errors.js';
import { roleDepts, roleMenus, roles } from './schema.js';
import { depts } from '../dept/schema.js';

/** 显式投影避免新增列自动进入公开出参。 */
export const roleRecordColumns = {
  id: roles.id,
  name: roles.name,
  type: roles.type,
  description: roles.description,
  enabled: roles.enabled,
  dataScope: roles.dataScope,
  version: roles.version,
  createdAt: roles.createdAt,
  updatedAt: roles.updatedAt,
};

export const roleDepartmentIds = sql<string[]>`array(
  select ${roleDepts.deptId} from ${roleDepts}
  where ${roleDepts.roleId} = ${roles.id} order by ${roleDepts.deptId}
)`;

export const roleColumns = { ...roleRecordColumns, deptIds: roleDepartmentIds };

export function selectRoleById(db: DbExec, id: string) {
  return db.select(roleColumns).from(roles).where(eq(roles.id, id)).limit(1);
}

/** 角色名区分大小写，与 DB 唯一约束一致。 */
async function roleNameMatchExists(db: DbExec, name: string, excludeId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.name, name), excludeId === undefined ? undefined : ne(roles.id, excludeId)))
    .limit(1);
  return rows.length > 0;
}

export function roleNameTaken(db: DbExec, name: string): Promise<boolean> {
  return roleNameMatchExists(db, name);
}

export function roleNameTakenByOther(db: DbExec, name: string, excludeId: string): Promise<boolean> {
  return roleNameMatchExists(db, name, excludeId);
}

/** 编辑不得修改 system/custom 保护属性；授权集合另走专属入口。 */
export interface RolePatch {
  name?: string;
  description?: string;
  enabled?: boolean;
  dataScope?: string;
  deptIds?: string[];
}

/** 授权集合属于角色聚合，替换时也须推进角色版本并持有行锁。 */
export async function updateRoleById(
  ctx: Pick<Ctx, 'clock'>,
  tx: TxExec,
  args: { id: string; version: number; set?: RolePatch },
) {
  const { deptIds, ...set } = args.set ?? {};
  const [updated] = await tx
    .update(roles)
    .set({ ...set, version: sql`${roles.version} + 1`, updatedAt: ctx.clock.now() })
    .where(and(eq(roles.id, args.id), eq(roles.version, args.version)))
    .returning(roleRecordColumns);
  if (!updated) return [];
  if (deptIds !== undefined) await replaceRoleDepartments(tx, updated.id, deptIds);
  return selectRoleById(tx, updated.id);
}

/** 在同一事务内校验并持有部门引用，保留 missing 详情且不留下预查后删除的竞态。 */
export async function replaceRoleDepartments(tx: TxExec, roleId: string, deptIds: readonly string[]) {
  const ids = [...new Set(deptIds)].sort();
  if (ids.length > 0) {
    const existing = await tx
      .select({ id: depts.id })
      .from(depts)
      .where(inArray(depts.id, ids))
      .orderBy(depts.id)
      .for('key share');
    const found = new Set(existing.map((dept) => dept.id));
    const missing = deptIds.filter((id) => !found.has(id));
    if (missing.length > 0) throw new BizError('dept.not_found', { missing });
  }
  await tx.delete(roleDepts).where(eq(roleDepts.roleId, roleId));
  if (ids.length > 0) await tx.insert(roleDepts).values(ids.map((deptId) => ({ roleId, deptId })));
}

/** 全量替换必须在事务内，避免删除与插入间出现零授权空窗；入参须先去重。 */
export async function replaceRoleMenus(
  ctx: Pick<Ctx, 'clock'>,
  tx: TxExec,
  args: { roleId: string; menuIds: readonly string[] },
): Promise<void> {
  await tx.delete(roleMenus).where(eq(roleMenus.roleId, args.roleId));
  if (args.menuIds.length === 0) return;
  const now = ctx.clock.now();
  await tx
    .insert(roleMenus)
    .values(args.menuIds.map((menuId) => ({ roleId: args.roleId, menuId, createdAt: now })));
}

// 调用方须短路空集合，避免依赖驱动的 inArray 空集行为。

export function selectExistingRoleIds(db: DbExec, roleIds: readonly string[]) {
  return db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.id, [...roleIds]));
}

export function selectMenuIdsOfRoles(db: DbExec, roleIds: readonly string[]) {
  return db
    .select({ menuId: roleMenus.menuId })
    .from(roleMenus)
    .where(inArray(roleMenus.roleId, [...roleIds]));
}

const ROLE_NAME_UNIQUE_CONSTRAINTS: readonly string[] = ['role_name_unique'];

const ROLE_IN_USE_CONSTRAINTS: readonly string[] = ['user_role_role_id_role_id_fk'];

/** 菜单或角色在预查后删除均属于授权引用冲突。 */
const ROLE_MENU_REFERENCE_CONSTRAINTS: readonly string[] = [
  'role_menu_role_id_role_id_fk',
  'role_menu_menu_id_menu_id_fk',
];

export function isRoleNameUniqueViolation(e: unknown): boolean {
  const constraint = violatedConstraint(e, PG_UNIQUE_VIOLATION);
  return constraint !== null && ROLE_NAME_UNIQUE_CONSTRAINTS.includes(constraint);
}

export function isRoleInUseViolation(e: unknown): boolean {
  const constraint = violatedConstraint(e, PG_REFERENCE_VIOLATION);
  return constraint !== null && ROLE_IN_USE_CONSTRAINTS.includes(constraint);
}

/** 授权引用对象在预查后消失，映射为可重试冲突。 */
export function isRoleMenuReferenceViolation(e: unknown): boolean {
  const constraint = violatedConstraint(e, PG_REFERENCE_VIOLATION);
  return constraint !== null && ROLE_MENU_REFERENCE_CONSTRAINTS.includes(constraint);
}
