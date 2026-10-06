import { and, eq, sql } from 'drizzle-orm';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { UpdateDeptSchema } from '../contract.js';
import { assertDepartmentAssignable, departmentDescendants, getDepartment } from '../domain/dept-access.js';
import { lockDepartmentTree } from '../domain/dept-reference.js';
import { previewOrganizationChange } from '../domain/organization.js';
import { depts } from '../schema.js';
import {
  assertDepartmentLeader,
  DeptWriteSchema,
  projectDeptWrite,
  rethrowDepartmentConstraint,
} from '../store.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { deptErrors } from '../errors.js';
import { DEPT_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'PATCH', path: '/depts/{id}', summary: '修改部门' },
  meta: {
    perm: DEPT_PERMS.update,
    superuserOnly: true,
  },
} satisfies SliceDefinition;

const inputSchema = UpdateDeptSchema;

const outputSchema = DeptWriteSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(deptErrors, [
    'dept.not_found',
    'dept.parent_cycle',
    'dept.version_conflict',
    'dept.code_conflict',
    'dept.disabled',
    'dept.leader_not_found',
    'dept.invalid_hierarchy',
    'dept.root_exists',
    'dept.impact_changed',
  ]),
};

export const updateDept = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const changed = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      await lockDepartmentTree(tx);
      const [before] = await getDepartment(tx, input.id);
      if (!before) throw new BizError('dept.not_found', { id: input.id });
      if (before.version !== input.version) throw new BizError('dept.version_conflict', { id: input.id });
      await assertDepartmentLeader(tx, input.leaderId);
      if (input.parentId !== undefined && input.parentId !== null) {
        await assertDepartmentAssignable(tx, input.parentId);
        if ((await departmentDescendants(tx, [input.id])).includes(input.parentId))
          throw new BizError('dept.parent_cycle');
      }
      if (input.parentId !== undefined || input.kind !== undefined) {
        const impact = await previewOrganizationChange(tx, input);
        if (
          (impact.companyChanges.length > 0 || input.impactFingerprint !== undefined) &&
          input.impactFingerprint !== impact.fingerprint
        )
          throw new BizError('dept.impact_changed');
      }
      const { id, version, impactFingerprint: _impactFingerprint, ...patch } = input;
      const [updated] = await tx
        .update(depts)
        .set({ ...patch, version: sql`${depts.version} + 1`, updatedAt: ctx.clock.now() })
        .where(and(eq(depts.id, id), eq(depts.version, version)))
        .returning();
      if (!updated) throw new BizError('dept.version_conflict', { id });
      const result = projectDeptWrite({ id: input.id, version: updated.version });
      return { before, updated, result };
    }).catch(rethrowDepartmentConstraint);

    ctx.audit.capture({
      objectType: 'dept',
      objectId: input.id,
      before: changed.before,
      after: changed.updated,
    });
    return changed.result;
  });
