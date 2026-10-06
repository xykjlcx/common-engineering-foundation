import { asc } from 'drizzle-orm';
import * as z from 'zod';
import { commonErrorContracts, PermissionError } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { postOptions } from '../../post/api.js';
import { PostViewSchema } from '../../post/contract.js';
import { getDepartments } from '../../dept/api.js';
import { OrganizationReferenceSchema } from '../../dept/contract.js';
import { roles, RoleTypeSchema } from '../../role/schema.js';
import { USER_PERMS } from '../permissions.js';
const definition = {
  route: { method: 'GET', path: '/users/lookups', summary: '用户业务引用目录' },
  meta: {
    perm: 'none',
    permNoneReason: '登录后还需持有至少一项用户业务权限；只返回表单/列表所需的引用目录。',
    anyOf: [
      USER_PERMS.view,
      USER_PERMS.create,
      USER_PERMS.update,
      USER_PERMS.import,
      USER_PERMS.assignRoles,
      USER_PERMS.move,
    ],
  },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.object({
  posts: z.array(PostViewSchema),
  departments: z.array(OrganizationReferenceSchema),
  roles: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      type: RoleTypeSchema,
      description: z.string(),
      enabled: z.boolean(),
    }),
  ),
});

const errors = { ...commonErrorContracts };

export const queryUserLookups = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    if (!ctx.isSuperuser && !definition.meta.anyOf.some((permission) => ctx.permissions.has(permission)))
      throw new PermissionError();
    const [postItems, departments, items] = await Promise.all([
      postOptions(ctx.db),
      getDepartments(ctx.db),
      ctx.db
        .select({
          id: roles.id,
          name: roles.name,
          type: roles.type,
          description: roles.description,
          enabled: roles.enabled,
        })
        .from(roles)
        .orderBy(asc(roles.name), asc(roles.id)),
    ]);
    const result = {
      posts: postItems,
      departments: departments.map((node) => ({ ...node, enabled: node.effectiveEnabled })),
      roles: items.map((item) => ({ ...item, type: RoleTypeSchema.parse(item.type) })),
    };
    return result;
  });
