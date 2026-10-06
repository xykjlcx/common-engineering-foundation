import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { countUsersOfRoles } from '../../user/api.js';
import { RoleDetailSchema } from '../contract.js';
import { selectMenuIdsOfRoles, selectRoleById } from '../store.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { roleErrors } from '../errors.js';
import { ROLE_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/roles/{id}', summary: '角色详情与实际授权' },
  meta: { perm: ROLE_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid() }).strict();

const outputSchema = RoleDetailSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(roleErrors, ['role.not_found']),
};

export const queryRoleDetail = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [row] = await selectRoleById(ctx.db, input.id);
    if (!row) throw new BizError('role.not_found', { id: input.id });
    const links = await selectMenuIdsOfRoles(ctx.db, [input.id]);
    const result = RoleDetailSchema.parse({
      ...row,
      createdAt: row.createdAt.toISOString(),
      menuIds: links.map((link) => link.menuId).sort(),
      memberCount: (await countUsersOfRoles(ctx.db, [input.id])).get(input.id) ?? 0,
    });
    return result;
  });
