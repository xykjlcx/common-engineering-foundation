import { asc, eq, inArray, sql } from 'drizzle-orm';
import * as z from 'zod';
import type { DbExec } from '../../../kernel/context.js';
import { BizError } from '../../../kernel/errors.js';
import { depts } from '../schema.js';
import { organizationContext } from './organization.js';

const DescendantRows = z.object({ rows: z.array(z.object({ id: z.uuid() })) });

/** 组织字典公共查询；业务用户行的范围由各模块 scoped 独立施加。 */
export const getDepartments = (db: DbExec) => db.select().from(depts).orderBy(asc(depts.sort), asc(depts.id));
export const getDepartment = (db: DbExec, id: string) =>
  db.select().from(depts).where(eq(depts.id, id)).limit(1);

const departmentReferenceColumns = {
  id: depts.id,
  parentId: depts.parentId,
  name: depts.name,
  enabled: depts.enabled,
  kind: depts.kind,
};

export async function getDepartmentReferences(db: DbExec) {
  const nodes = await db
    .select(departmentReferenceColumns)
    .from(depts)
    .orderBy(asc(depts.sort), asc(depts.id));
  return nodes.map((node) => ({ ...node, ...organizationContext(nodes, node.id) }));
}

export async function getDepartmentReference(db: DbExec, id: string) {
  return (await getDepartmentReferences(db)).filter((node) => node.id === id);
}

/**
 * 子树展开交给数据库一条 WITH RECURSIVE（PG 与 PGlite 都支持）。
 * `union`（非 union all）在环形父子引用下也会收敛，不需要应用层再兜一次访问集。
 */
export async function departmentDescendants(db: DbExec, roots: readonly string[]): Promise<string[]> {
  if (roots.length === 0) return [];
  const result = await db.execute(sql`
    with recursive subtree(id) as (
      select ${depts.id} from ${depts} where ${inArray(depts.id, [...roots])}
      union
      select ${depts.id} from ${depts} join subtree on ${depts.parentId} = subtree.id
    )
    select id from subtree
  `);
  return DescendantRows.parse(result)
    .rows.map((row) => row.id)
    .sort();
}

export async function assertDepartmentAssignable(db: DbExec, id: string | null): Promise<void> {
  if (id === null) return;
  const [dept] = await getDepartment(db, id);
  if (!dept) throw new BizError('dept.not_found', { id });
  if (!organizationContext(await getDepartments(db), id).effectiveEnabled)
    throw new BizError('dept.disabled', { id });
}
