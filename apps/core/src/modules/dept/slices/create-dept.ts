import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { CreateDeptSchema } from '../contract.js';
import { assertDepartmentAssignable, getDepartments } from '../domain/dept-access.js';
import { assertOrganizationPosition } from '../domain/organization.js';
import { lockDepartmentTree } from '../domain/dept-reference.js';
import { depts } from '../schema.js';
import {
  assertDepartmentLeader,
  DeptWriteSchema,
  projectDeptWrite,
  rethrowDepartmentConstraint,
} from '../store.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { deptErrors } from '../errors.js';
import { DEPT_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/depts', summary: '创建部门' },
  meta: {
    perm: DEPT_PERMS.create,
    superuserOnly: true,
  },
} satisfies SliceDefinition;

const inputSchema = CreateDeptSchema;

const outputSchema = DeptWriteSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(deptErrors, [
    'dept.code_conflict',
    'dept.disabled',
    'dept.leader_not_found',
    'dept.not_found',
    'dept.invalid_hierarchy',
    'dept.root_exists',
    'dept.parent_cycle',
  ]),
};

export const createDept = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      await lockDepartmentTree(tx);
      await assertDepartmentAssignable(tx, input.parentId);
      await assertDepartmentLeader(tx, input.leaderId);
      const id = ctx.idgen();
      assertOrganizationPosition(await getDepartments(tx), { ...input, id });
      await tx
        .insert(depts)
        .values({ ...input, id, version: 0, createdAt: ctx.clock.now(), updatedAt: ctx.clock.now() });
      return projectDeptWrite({ id, version: 0 });
    }).catch(rethrowDepartmentConstraint);

    ctx.audit.capture({ objectType: 'dept', objectId: result.id, after: input });
    return result;
  });
