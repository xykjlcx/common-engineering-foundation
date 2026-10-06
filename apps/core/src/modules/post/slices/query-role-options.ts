import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, kernelErrors } from '../../../kernel/errors.js';
import { POST_PERMS } from '../permissions.js';
import { postErrors } from '../errors.js';
import { PostRoleSchema } from '../contract.js';
import { listTemplateRoles, getPermCodesOfRoles } from '../../role/api.js';

const definition = {
  route: { method: 'GET', path: '/posts/role-options', summary: '岗位默认角色选项' },
  meta: { perm: POST_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();
const outputSchema = z.array(PostRoleSchema);
const errors = { ...commonErrorContracts, ...postErrors, ...kernelErrors };

export const queryRoleOptions = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    void input;
    const roles = (await listTemplateRoles(ctx.db)).filter((role) => role.enabled);
    if (ctx.isSuperuser) return roles;

    const eligible = await Promise.all(
      roles.map(async (role) => ({
        role,
        allowed: (await getPermCodesOfRoles(ctx.db, [role.id])).every((code) => ctx.permissions.has(code)),
      })),
    );

    return eligible.filter((row) => row.allowed).map((row) => row.role);
  });
