import { asc, count, desc, ilike, type SQL, type SQLWrapper } from 'drizzle-orm';
import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { RolePageSchema, RoleSortSchema } from '../contract.js';
import { roleColumns } from '../store.js';
import { RoleDataScopeSchema, roles, RoleTypeSchema } from '../schema.js';
import { countUsersOfRoles } from '../../user/api.js';
import { ROLE_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/roles', summary: '角色列表（分页）' },
  meta: { perm: ROLE_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
    keyword: z.string().trim().max(64).optional(),
    sort: RoleSortSchema.optional(),
  })
  .strict();

const outputSchema = RolePageSchema;

const errors = { ...commonErrorContracts };

function keywordSql(keyword: string | undefined): SQL | undefined {
  if (!keyword) return undefined;
  return ilike(roles.name, `%${keyword.replace(/[\\%_]/g, (character) => `\\${character}`)}%`);
}

// 次键 id 不是装饰：只按 createdAt 排序时同毫秒落库的角色在翻页之间相对顺序不稳，
// 会出现"第 2 页重复看见第 1 页的行、另一行永远看不到"。
function orderBy(raw: string | undefined): SQL[] {
  if (raw === undefined) return [asc(roles.createdAt), asc(roles.id)];
  const [field, direction] = RoleSortSchema.parse(raw).split(':');
  const column: SQLWrapper = field === 'name' ? roles.name : field === 'type' ? roles.type : roles.createdAt;
  const order = direction === 'desc' ? desc : asc;
  return [order(column), asc(roles.id)];
}

export const queryRoleList = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const offset = (input.page - 1) * input.pageSize;
    const where = keywordSql(input.keyword);
    const rows = await ctx.db
      .select(roleColumns)
      .from(roles)
      .where(where)
      .orderBy(...orderBy(input.sort))
      .limit(input.pageSize)
      .offset(offset);

    // total 与当前页使用相同筛选条件。
    const [totals] = await ctx.db.select({ value: count() }).from(roles).where(where);
    const memberCounts = await countUsersOfRoles(
      ctx.db,
      rows.map((row) => row.id),
    );
    const result = {
      list: rows.map((row) => ({
        id: row.id,
        memberCount: memberCounts.get(row.id) ?? 0,
        name: row.name,
        type: RoleTypeSchema.parse(row.type),
        description: row.description,
        dataScope: RoleDataScopeSchema.parse(row.dataScope),
        deptIds: row.deptIds,
        enabled: row.enabled,
        version: row.version,
        createdAt: row.createdAt.toISOString(),
      })),
      total: totals?.value ?? 0,
      page: input.page,
      pageSize: input.pageSize,
    };
    return result;
  });
