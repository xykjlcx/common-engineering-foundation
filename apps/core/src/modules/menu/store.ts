import { and, count, eq, inArray, sql } from 'drizzle-orm';
import type { Ctx, DbExec } from '../../kernel/context.js';
import { PG_REFERENCE_VIOLATION, PG_UNIQUE_VIOLATION, violatedConstraint } from '../../kernel/pg-error.js';
import { menus, type MenuType } from './schema.js';

/** 显式投影避免新增列自动进入公开出参。 */
export const menuColumns = {
  id: menus.id,
  catalogIdentity: menus.catalogIdentity,
  parentId: menus.parentId,
  subsystemKey: menus.subsystemKey,
  type: menus.type,
  label: menus.label,
  icon: menus.icon,
  path: menus.path,
  permCode: menus.permCode,
  visible: menus.visible,
  sort: menus.sort,
  version: menus.version,
  createdAt: menus.createdAt,
  updatedAt: menus.updatedAt,
};

export function findMenuById(db: DbExec, id: string) {
  return db.select(menuColumns).from(menus).where(eq(menus.id, id)).limit(1);
}

export function listMenus(db: DbExec) {
  return db.select(menuColumns).from(menus);
}

export function selectExistingMenuIds(db: DbExec, menuIds: readonly string[]) {
  return db
    .select({ id: menus.id })
    .from(menus)
    .where(inArray(menus.id, [...menuIds]));
}

export function selectPermCodesOfMenus(db: DbExec, menuIds: readonly string[]) {
  return db
    .select({ permCode: menus.permCode })
    .from(menus)
    .where(inArray(menus.id, [...menuIds]));
}

/** 子节点计数（删除前置断言）。必须与 DELETE 同事务执行，否则中间可插入新子节点 */
export async function countChildren(db: DbExec, parentId: string): Promise<number> {
  const [row] = await db.select({ total: count() }).from(menus).where(eq(menus.parentId, parentId));
  return row?.total ?? 0;
}

export function insertMenu(ctx: Pick<Ctx, 'clock' | 'idgen'>, exec: DbExec, values: MenuCreateValues) {
  const now = ctx.clock.now();
  return exec
    .insert(menus)
    .values({ ...values, id: ctx.idgen(), version: 0, createdAt: now, updatedAt: now })
    .returning(menuColumns);
}

export interface MenuCreateValues {
  parentId: string | null;
  subsystemKey: string;
  type: MenuType;
  label: Record<string, string>;
  icon: string | null;
  path: string | null;
  permCode: string | null;
  visible: boolean;
  sort: number;
}

/** 展示可写白名单；代码身份(path/permCode/type/subsystem/catalogIdentity)不进入此构造器。 */
export interface MenuPatch {
  parentId?: string | null;
  label?: Record<string, string>;
  icon?: string | null;
  visible?: boolean;
  sort?: number;
}

/** 未命中时由事务内复查区分版本冲突与不存在。 */
export function updateMenuById(
  ctx: Pick<Ctx, 'clock'>,
  tx: DbExec,
  args: { id: string; version: number; set: MenuPatch },
) {
  return tx
    .update(menus)
    .set({ ...args.set, version: sql`${menus.version} + 1`, updatedAt: ctx.clock.now() })
    .where(and(eq(menus.id, args.id), eq(menus.version, args.version)))
    .returning(menuColumns);
}

/** 删除也须匹配版本，避免删除已被他人修改的节点。 */
export function deleteMenuById(tx: DbExec, args: { id: string; version: number }) {
  return tx
    .delete(menus)
    .where(and(eq(menus.id, args.id), eq(menus.version, args.version)))
    .returning({ id: menus.id });
}

const PERM_CODE_UNIQUE_CONSTRAINT = 'menu_perm_code_unique';

const PARENT_FK_CONSTRAINT = 'menu_parent_id_menu_id_fk';

export function isPermCodeUniqueViolation(e: unknown): boolean {
  return violatedConstraint(e, PG_UNIQUE_VIOLATION) === PERM_CODE_UNIQUE_CONSTRAINT;
}

export function isParentForeignKeyViolation(e: unknown): boolean {
  return violatedConstraint(e, PG_REFERENCE_VIOLATION) === PARENT_FK_CONSTRAINT;
}
