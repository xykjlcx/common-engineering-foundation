import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { DeptViewSchema } from '../contract.js';
import { getDepartmentViews } from '../domain/query-view.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { deptErrors } from '../errors.js';
import { DEPT_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/depts/{id}', summary: '部门详情与直属成员数' },
  meta: { perm: DEPT_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid() }).strict();

const outputSchema = DeptViewSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(deptErrors, ['dept.not_found']),
};

export const getDeptDetail = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [row] = await getDepartmentViews(ctx.db, input.id);
    if (!row) throw new BizError('dept.not_found');
    return row;
  });
