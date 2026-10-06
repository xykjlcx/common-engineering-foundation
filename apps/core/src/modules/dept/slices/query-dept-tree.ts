import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { DeptViewSchema } from '../contract.js';
import { getDepartmentViews } from '../domain/query-view.js';
import { DEPT_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/depts', summary: '部门目录（parentId组树）' },
  meta: { perm: DEPT_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.array(DeptViewSchema);

const errors = { ...commonErrorContracts };

export const queryDeptTree = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    const result = getDepartmentViews(ctx.db);
    return result;
  });
