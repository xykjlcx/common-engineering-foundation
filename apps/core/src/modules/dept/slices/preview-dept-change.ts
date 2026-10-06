import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts, pick } from '../../../kernel/errors.js';
import { DeptChangePreviewSchema, UpdateDeptSchema } from '../contract.js';
import { previewOrganizationChange } from '../domain/organization.js';
import { deptErrors } from '../errors.js';
import { DEPT_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/depts/{id}/preview', summary: '预览组织调整与所属公司变化' },
  meta: { perm: DEPT_PERMS.update, superuserOnly: true },
} satisfies SliceDefinition;
const inputSchema = UpdateDeptSchema;
const outputSchema = DeptChangePreviewSchema;
const errors = {
  ...commonErrorContracts,
  ...pick(deptErrors, [
    'dept.not_found',
    'dept.version_conflict',
    'dept.invalid_hierarchy',
    'dept.root_exists',
    'dept.parent_cycle',
    'dept.disabled',
  ]),
};

export const previewDeptChange = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => previewOrganizationChange(ctx.db, input));
