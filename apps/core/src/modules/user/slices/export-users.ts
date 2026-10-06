import { and, eq, inArray } from 'drizzle-orm';
import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { getLastLogins } from '../../auth/api.js';
import { depts } from '../../dept/schema.js';
import { roles } from '../../role/schema.js';
import {
  UserFiltersJsonSchema,
  UserSortSchema,
  userFilterSql,
  userKeywordSql,
  userOrderBy,
} from '../domain/user-filter.js';
import { userView } from '../domain/user-view.js';
import { UserExportColumnSchema } from '../import-contract.js';
import { UserStatusSchema, appUsers } from '../schema.js';
import { roleGrantsOfUsersRaw, visibleUsers } from '../scoped.js';
import { ValidationError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: {
    method: 'GET',
    path: '/users/export',
    summary: '按列表筛选导出用户CSV（最多10000行）',
  },
  meta: { perm: USER_PERMS.export },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    ids: z.array(z.uuid()).min(1).max(500).optional(),
    keyword: z.string().trim().max(64).optional(),
    status: UserStatusSchema.optional(),
    filters: UserFiltersJsonSchema.optional(),
    sort: UserSortSchema.optional(),
    columns: z.array(UserExportColumnSchema).min(1).max(UserExportColumnSchema.options.length),
  })
  .strict();

const outputSchema = z.file();

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.export_limit_exceeded']),
};
const columnLabels: Record<z.infer<typeof UserExportColumnSchema>, string> = {
  username: '用户名',
  name: '姓名',
  email: '邮箱',
  phone: '手机',
  employeeNo: '工号',
  dept: '部门',
  roles: '角色',
  status: '状态',
  deptId: '部门ID',
  managerId: '上级ID',
  postName: '职位',
  gender: '性别',
  employmentType: '用工类型',
  employmentStatus: '在职状态',
  joinedAt: '入职日期',
  workLocation: '工作地点',
  remark: '备注',
  accountStatus: '账号状态',
  roleIds: '角色ID',
  mustChangePassword: '首次登录需改密',
  effectiveAt: '账号生效时间',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  lastLoginAt: '最近登录',
};
const statusLabels: Record<string, string> = {
  active: '在职',
  probation: '试用',
  left: '离职',
  disabled: '已禁用',
  unset: '未设置',
};
type CsvValue = string | number | boolean | readonly string[] | null | undefined;

function csvCell(value: CsvValue): string {
  const raw =
    value === null || value === undefined ? '' : Array.isArray(value) ? value.join(';') : String(value);
  // 防止Excel等把用户文本执行成公式；保留CSV本身的双引号与换行转义。
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const exportUsers = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const where = and(
      input.ids ? inArray(appUsers.id, input.ids) : undefined,
      userKeywordSql(input.keyword),
      input.status ? eq(appUsers.status, input.status) : undefined,
      await userFilterSql(ctx.db, input.filters),
    );
    const rows = await visibleUsers(ctx, { where })
      .orderBy(...userOrderBy(input.sort))
      .limit(10001);
    if (rows.length > 10000) throw new ValidationError('user.export_limit_exceeded', { limit: 10000 });
    const ids = rows.map((row) => row.id);
    const [grants, logins] = await Promise.all([
      roleGrantsOfUsersRaw(ctx.db, ids),
      getLastLogins(ctx.db, ids),
    ]);
    const roleMap = new Map<string, string[]>();
    for (const grant of grants)
      roleMap.set(grant.userId, [...(roleMap.get(grant.userId) ?? []), grant.roleId]);
    const columns = [...new Set(input.columns)];
    const deptIds = [...new Set(rows.flatMap((row) => (row.deptId ? [row.deptId] : [])))];
    const assignedRoleIds = [...new Set(grants.map((grant) => grant.roleId))];
    const [departments, assignedRoles] = await Promise.all([
      columns.includes('dept') && deptIds.length
        ? ctx.db.select({ id: depts.id, name: depts.name }).from(depts).where(inArray(depts.id, deptIds))
        : [],
      columns.includes('roles') && assignedRoleIds.length
        ? ctx.db
            .select({ id: roles.id, name: roles.name })
            .from(roles)
            .where(inArray(roles.id, assignedRoleIds))
        : [],
    ]);
    const departmentNames = new Map(departments.map((dept) => [dept.id, dept.name]));
    const roleNames = new Map(assignedRoles.map((role) => [role.id, role.name]));
    const lines = [
      columns.map((column) => columnLabels[column]).join(','),
      ...rows.map((row) => {
        const view = userView(row, (roleMap.get(row.id) ?? []).sort(), logins.get(row.id) ?? null);
        const result = columns
          .map((column) => {
            if (column === 'dept')
              return csvCell(view.deptId ? (departmentNames.get(view.deptId) ?? '') : '');
            if (column === 'roles')
              return csvCell(
                view.roleIds
                  .map((id) => roleNames.get(id) ?? '')
                  .filter(Boolean)
                  .join(';'),
              );
            if (column === 'status')
              return csvCell(
                statusLabels[
                  view.accountStatus === 'disabled' ? 'disabled' : (view.employmentStatus ?? 'unset')
                ],
              );
            return csvCell(view[column]);
          })
          .join(',');
        return result;
      }),
    ];
    return new File(['\uFEFF', lines.join('\r\n'), '\r\n'], 'users.csv', {
      type: 'text/csv;charset=utf-8',
    });
  });
