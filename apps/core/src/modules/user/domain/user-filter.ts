import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  not,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import type { DbExec } from '../../../kernel/context.js';
import { ValidationError } from '../../../kernel/errors.js';
import { postNameSql } from '../../post/api.js';
import { latestSuccessfulLoginAt } from '../../auth/api.js';
import { departmentDescendants } from '../../dept/api.js';
import { depts } from '../../dept/schema.js';
import { menus } from '../../menu/schema.js';
import { roleMenus, roles } from '../../role/schema.js';
import { appUsers, userRoles } from '../schema.js';

import { rootSchema, UserFiltersJsonSchema, UserSortSchema, type Condition } from '../filter-contract.js';
export { UserFiltersJsonSchema, UserSortSchema } from '../filter-contract.js';

const displayStatus = sql<string>`case when ${appUsers.status} <> 'active' then 'disabled' else coalesce(${appUsers.employmentStatus}, 'unset') end`;
const displayStatusRank = sql<number>`case ${displayStatus} when 'active' then 0 when 'probation' then 1 when 'left' then 2 when 'disabled' then 3 else 4 end`;
const enabled = sql<string>`case when ${appUsers.status} = 'active' then 'true' else 'false' end`;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (character) => `\\${character}`);

function textColumn(field: Condition['field']): SQLWrapper {
  switch (field) {
    case 'name':
      return appUsers.name;
    case 'employeeNo':
      return appUsers.employeeNo;
    case 'account':
    case 'username':
      return appUsers.username;
    case 'phone':
      return appUsers.phone;
    case 'email':
      return appUsers.email;
    case 'remark':
      return appUsers.remark;
    case 'workLocation':
      return appUsers.workLocation;
    case 'employmentType':
      return appUsers.employmentType;
    case 'gender':
      return appUsers.gender;
    case 'enabled':
      return enabled;
    case 'status':
      return sql`nullif(${displayStatus}, 'unset')`;
    default:
      throw new ValidationError('validation.failed', { field });
  }
}

function valuesOf(condition: Condition): string[] {
  return Array.isArray(condition.value)
    ? condition.value
    : typeof condition.value === 'string'
      ? [condition.value]
      : [];
}

function relationMatch(condition: Condition): SQL {
  const values = valuesOf(condition);
  const empty = condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty';
  const criterion = empty
    ? sql`true`
    : inArray(condition.field === 'roleIds' ? userRoles.roleId : menus.subsystemKey, values);
  // EXISTS 不扩张外层用户行，分页与 total 不受一个角色多个菜单影响。
  const hit =
    condition.field === 'roleIds'
      ? sql`exists (select 1 from ${userRoles} where ${userRoles.userId} = ${appUsers.id} and ${criterion})`
      : sql`((${appUsers.isSystemAdmin} and exists (select 1 from ${menus} where ${criterion})) or exists (
      select 1 from ${userRoles}
      inner join ${roles} on ${roles.id} = ${userRoles.roleId}
      inner join ${roleMenus} on ${roleMenus.roleId} = ${roles.id}
      inner join ${menus} on ${menus.id} = ${roleMenus.menuId}
      where ${userRoles.userId} = ${appUsers.id} and ${roles.enabled} = true and ${criterion}
    ))`;
  return ['ne', 'notIn', 'isEmpty'].includes(condition.operator) ? not(hit) : hit;
}

async function conditionSql(db: DbExec, condition: Condition): Promise<SQL> {
  const { field, operator } = condition;
  const values = valuesOf(condition);
  if (field === 'roleIds' || field === 'subsystemKeys') return relationMatch(condition);
  if (field === 'postId') {
    if (operator === 'isEmpty') return isNull(appUsers.postId);
    if (operator === 'isNotEmpty') return not(isNull(appUsers.postId));
    const hit = sql`coalesce(${inArray(appUsers.postId, values)}, false)`;
    return operator === 'ne' || operator === 'notIn' ? not(hit) : hit;
  }
  if (field === 'deptId') {
    if (operator === 'isEmpty') return isNull(appUsers.deptId);
    if (operator === 'isNotEmpty') return not(isNull(appUsers.deptId));
    const ids = condition.scope === 'exact' ? values : await departmentDescendants(db, values);
    const hit = sql`coalesce(${inArray(appUsers.deptId, ids)}, false)`;
    return operator === 'ne' || operator === 'notIn' ? not(hit) : hit;
  }
  if (field === 'joinedAt' || field === 'lastLoginAt' || field === 'effectiveAt') {
    // joinedAt 是日期本身；时间戳筛选按 UTC 日界，避免依赖数据库连接的时区设置。
    const column =
      field === 'joinedAt'
        ? appUsers.joinedAt
        : sql`(${field === 'lastLoginAt' ? latestSuccessfulLoginAt(appUsers.id) : appUsers.effectiveAt} at time zone 'UTC')::date`;
    if (operator === 'isEmpty') return isNull(column);
    if (operator === 'isNotEmpty') return not(isNull(column));
    const first = values[0];
    if (operator === 'gte') return sql`${column} >= ${first}::date`;
    if (operator === 'lte') return sql`${column} <= ${first}::date`;
    return sql`${column} between ${first}::date and ${values[1]}::date`;
  }
  const column = textColumn(field);
  const normalized = sql<string>`lower(btrim(coalesce(${column}::text, '')))`;
  if (operator === 'isEmpty') return eq(normalized, '');
  if (operator === 'isNotEmpty') return not(eq(normalized, ''));
  if (operator === 'contains') return ilike(normalized, `%${escapeLike(values[0] ?? '')}%`);
  const hit = inArray(
    normalized,
    values.map((value) => (field === 'status' && value === 'unset' ? '' : value.toLowerCase())),
  );
  return operator === 'ne' || operator === 'notIn' ? not(hit) : hit;
}

export async function userFilterSql(db: DbExec, raw: string | undefined): Promise<SQL | undefined> {
  if (raw === undefined) return undefined;
  const parsed = rootSchema.parse(JSON.parse(UserFiltersJsonSchema.parse(raw)));
  const conditions = await Promise.all(
    parsed.items.map(async (item) => {
      if (!('items' in item)) return conditionSql(db, item);
      const group = await Promise.all(item.items.map((condition) => conditionSql(db, condition)));
      return item.op === 'and' ? and(...group) : or(...group);
    }),
  );
  return and(...conditions);
}

export function userKeywordSql(keyword: string | undefined): SQL | undefined {
  if (!keyword) return undefined;
  const pattern = `%${escapeLike(keyword)}%`;
  return or(
    ...[appUsers.username, appUsers.name, appUsers.employeeNo, appUsers.phone, appUsers.email].map((column) =>
      ilike(column, pattern),
    ),
  );
}

export function userOrderBy(raw: string | undefined): SQL[] {
  if (raw === undefined) return [desc(appUsers.createdAt), desc(appUsers.id)];
  const [field, direction] = UserSortSchema.parse(raw).split(':');
  let column: SQLWrapper;
  switch (field) {
    case 'name':
      column = appUsers.name;
      break;
    case 'employeeNo':
      column = appUsers.employeeNo;
      break;
    // 按部门自身名称排序；不是 UUID，也不是整条祖先路径。
    case 'deptId':
      column = sql`(select ${depts.name} from ${depts} where ${depts.id} = ${appUsers.deptId})`;
      break;
    case 'postName':
      column = postNameSql(appUsers.postId);
      break;
    case 'joinedAt':
      column = appUsers.joinedAt;
      break;
    case 'lastLoginAt':
      column = latestSuccessfulLoginAt(appUsers.id);
      break;
    case 'status':
      column = displayStatusRank;
      break;
    default:
      throw new ValidationError('validation.failed', { field });
  }
  // 两个方向都把无值放后，id 是固定次键，跨页不会因同值行重排而丢行/重复。
  return [sql`${direction === 'desc' ? desc(column) : asc(column)} nulls last`, asc(appUsers.id)];
}
