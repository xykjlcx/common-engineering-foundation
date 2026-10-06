import { asc, eq, inArray } from 'drizzle-orm';
import type { DbExec } from '../../../kernel/context.js';
import { BizError } from '../../../kernel/errors.js';
import { depts } from '../../dept/schema.js';
import { roles } from '../../role/schema.js';
import type { NoticeAudience } from '../contract.js';

export async function audienceOptions(db: DbExec) {
  const departments = await db
    .select({ id: depts.id, name: depts.name })
    .from(depts)
    .where(eq(depts.enabled, true))
    .orderBy(asc(depts.name), asc(depts.id));
  const roleOptions = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.enabled, true))
    .orderBy(asc(roles.name), asc(roles.id));
  return { departments, roles: roleOptions };
}
export async function assertAudience(db: DbExec, audience: NoticeAudience, ids: string[]) {
  if (audience === 'all') {
    if (ids.length) throw new BizError('notice.invalid_audience');
    return;
  }
  if (!ids.length) throw new BizError('notice.invalid_audience');
  const table = audience === 'departments' ? depts : roles;
  const rows = await db
    .select({ id: table.id, enabled: table.enabled })
    .from(table)
    .where(inArray(table.id, ids));
  if (rows.length !== new Set(ids).size || rows.some((row) => !row.enabled))
    throw new BizError('notice.invalid_audience');
}
