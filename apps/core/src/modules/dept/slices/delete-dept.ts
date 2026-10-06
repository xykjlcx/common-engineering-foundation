import { and, eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { countUsersOfDepartments } from '../../user/api.js';
import { getDepartment, getDepartments } from '../domain/dept-access.js';
import { lockDepartmentTree } from '../domain/dept-reference.js';
import { rethrowDepartmentDeleteConstraint } from '../store.js';
import { depts } from '../schema.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { deptErrors } from '../errors.js';
import { DEPT_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'DELETE', path: '/depts/{id}', summary: '删除无引用的部门' },
  meta: {
    perm: DEPT_PERMS.delete,
    superuserOnly: true,
  },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid(), version: z.number().int().min(0) }).strict();

const outputSchema = z.object({ id: z.uuid() });

const errors = {
  ...commonErrorContracts,
  ...pick(deptErrors, ['dept.in_use', 'dept.not_found', 'dept.version_conflict']),
};

export const deleteDept = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const before = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      await lockDepartmentTree(tx);
      const [target] = await getDepartment(tx, input.id);
      if (!target) throw new BizError('dept.not_found', { id: input.id });
      if (target.version !== input.version) throw new BizError('dept.version_conflict', { id: input.id });
      const nodes = await getDepartments(tx);
      const members = await countUsersOfDepartments(tx, [input.id], true);
      if (nodes.some((node) => node.parentId === input.id) || (members.get(input.id) ?? 0) > 0)
        throw new BizError('dept.in_use', { id: input.id });
      const [deleted] = await tx
        .delete(depts)
        .where(and(eq(depts.id, input.id), eq(depts.version, input.version)))
        .returning()
        .catch((error: unknown) => rethrowDepartmentDeleteConstraint(error, input.id));
      if (!deleted) throw new BizError('dept.version_conflict', { id: input.id });
      return { deleted, result: outputSchema.parse({ id: input.id }) };
    });

    ctx.audit.capture({ objectType: 'dept', objectId: input.id, before: before.deleted, after: null });
    return before.result;
  });
