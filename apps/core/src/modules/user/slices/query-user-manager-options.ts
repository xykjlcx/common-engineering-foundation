import { and, asc, eq, ilike, ne, or } from 'drizzle-orm';
import * as z from 'zod';
import type { DataScope } from '../../../kernel/context.js';
import { commonErrorContracts, PermissionError } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { resolveRoleScope } from '../../role/api.js';
import { UserManagerOptionSchema } from '../contract.js';
import { getAuthUserById } from '../domain/user-credentials.js';
import { getRoleIdsOfUser } from '../domain/user-access.js';
import { appUsers } from '../schema.js';
import { countVisibleUsers, visibleUsers } from '../scoped.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: {
    method: 'GET',
    path: '/users/manager-options',
    summary: '可见直属上级候选（分页搜索及已选值回显）',
  },
  meta: {
    perm: 'none',
    permNoneReason:
      '用户表单最小人员引用；按调用者实际持有的用户权限重新合并范围，不能沿用 none 的默认范围。',
    anyOf: [USER_PERMS.view, USER_PERMS.create, USER_PERMS.update, USER_PERMS.import],
  },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    keyword: z.string().trim().max(64).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(30),
    selectedId: z.uuid().optional(),
    excludeId: z.uuid().optional(),
  })
  .strict();

const outputSchema = z.object({
  list: z.array(UserManagerOptionSchema),
  selected: UserManagerOptionSchema.nullable(),
  total: z.number().int(),
});

const errors = { ...commonErrorContracts };

export const queryUserManagerOptions = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const allowed = definition.meta.anyOf.filter((permission) => ctx.permissions.has(permission));
    if (!ctx.isSuperuser && !allowed.length) throw new PermissionError();
    const actor = await getAuthUserById(ctx.db, ctx.userId);
    if (!actor) throw new PermissionError();
    let scope: DataScope = 'all';
    if (!ctx.isSuperuser) {
      const roleIds = await getRoleIdsOfUser(ctx.db, ctx.userId);
      const scopes = await Promise.all(
        allowed.map((permission) => resolveRoleScope(ctx.db, roleIds, permission, actor)),
      );
      scope = scopes.includes('all')
        ? 'all'
        : {
            kind: 'scoped',
            ids: [
              ...new Set(
                scopes.flatMap((item) =>
                  item === 'own' ? [ctx.userId] : item === 'all' ? [] : [...item.ids],
                ),
              ),
            ],
            unitIds: [
              ...new Set(scopes.flatMap((item) => (typeof item === 'object' ? [...item.unitIds] : []))),
            ],
          };
    }
    const scoped = { ...ctx, scope };
    const pattern = input.keyword ? `%${input.keyword.replace(/[\\%_]/g, '\\$&')}%` : undefined;
    const matching = pattern
      ? or(ilike(appUsers.name, pattern), ilike(appUsers.employeeNo, pattern))
      : undefined;
    const where = and(
      eq(appUsers.status, 'active'),
      input.excludeId ? ne(appUsers.id, input.excludeId) : undefined,
      matching,
    );
    const [rows, totals, selected] = await Promise.all([
      visibleUsers(scoped, { where })
        .orderBy(asc(appUsers.name), asc(appUsers.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      countVisibleUsers(scoped, { where }),
      input.selectedId ? visibleUsers(scoped, { where: eq(appUsers.id, input.selectedId) }).limit(1) : [],
    ]);
    const project = ({ id, name, employeeNo }: (typeof rows)[number]) => ({ id, name, employeeNo });
    const result = {
      list: rows.map(project),
      total: totals[0]?.total ?? 0,
      selected: selected[0] ? project(selected[0]) : null,
    };
    return result;
  });
