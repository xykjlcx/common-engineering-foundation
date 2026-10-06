import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { countUsersOfDepartments } from '../../user/api.js';
import { getOrganizationRoleReferences } from '../../role/api.js';
import { DeptReferencesSchema } from '../contract.js';
import { getDepartments } from '../domain/dept-access.js';
import { deptErrors } from '../errors.js';
import { DEPT_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/depts/{id}/references', summary: '组织删除引用与处理入口' },
  meta: { perm: DEPT_PERMS.delete, superuserOnly: true },
} satisfies SliceDefinition;
const inputSchema = z.object({ id: z.uuid() }).strict();
const outputSchema = DeptReferencesSchema;
const errors = { ...commonErrorContracts, ...pick(deptErrors, ['dept.not_found']) };

export const queryDeptReferences = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const nodes = await getDepartments(ctx.db);
    if (!nodes.some((node) => node.id === input.id)) throw new BizError('dept.not_found');
    const [active, all, roles] = await Promise.all([
      countUsersOfDepartments(ctx.db, [input.id]),
      countUsersOfDepartments(ctx.db, [input.id], true),
      getOrganizationRoleReferences(ctx.db, input.id),
    ]);
    const memberCount = active.get(input.id) ?? 0;
    return {
      children: nodes
        .filter((node) => node.parentId === input.id)
        .map(({ id, name, kind }) => ({ id, name, kind })),
      memberCount,
      archivedMemberCount: (all.get(input.id) ?? 0) - memberCount,
      roles,
    };
  });
