import { and, eq } from 'drizzle-orm';
import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { getLastLogins } from '../../auth/api.js';
import { UserPageSchema } from '../contract.js';
import {
  UserFiltersJsonSchema,
  userFilterSql,
  userKeywordSql,
  userOrderBy,
  UserSortSchema,
} from '../domain/user-filter.js';
import { userView } from '../domain/user-view.js';
import { appUsers, UserStatusSchema } from '../schema.js';
import { countVisibleUsers, roleGrantsOfUsersRaw, visibleUsers } from '../scoped.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/users', summary: '用户分页列表（关键词、条件组及稳定排序）' },
  meta: { perm: USER_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
    keyword: z.string().trim().max(64).optional(),
    status: UserStatusSchema.optional(),
    filters: UserFiltersJsonSchema.optional(),
    sort: UserSortSchema.optional(),
  })
  .strict();

const outputSchema = UserPageSchema;

const errors = { ...commonErrorContracts };

export const queryUserList = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // total 与当前页共用 where，并与数据范围取交集。
    const where = and(
      userKeywordSql(input.keyword),
      input.status === undefined ? undefined : eq(appUsers.status, input.status),
      await userFilterSql(ctx.db, input.filters),
    );
    const [rows, totals] = await Promise.all([
      visibleUsers(ctx, { where })
        // 次键 id 兜底：仅按 createdAt 排序时同毫秒建的行在页间顺序不稳定，
        // 表现是翻页丢行/重复行（uuidv7 单调，作次键即稳定序）
        .orderBy(...userOrderBy(input.sort))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      countVisibleUsers(ctx, { where }),
    ]);
    const ids = rows.map((row) => row.id);
    const [grants, lastLogins] = await Promise.all([
      roleGrantsOfUsersRaw(ctx.db, ids),
      getLastLogins(ctx.db, ids),
    ]);
    const result = {
      list: rows.map((row) =>
        userView(
          row,
          grants
            .filter((grant) => grant.userId === row.id)
            .map((grant) => grant.roleId)
            .sort(),
          lastLogins.get(row.id) ?? null,
        ),
      ),
      total: totals[0]?.total ?? 0,
      page: input.page,
      pageSize: input.pageSize,
    };
    return result;
  });
