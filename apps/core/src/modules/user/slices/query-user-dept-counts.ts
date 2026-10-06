import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { USER_PERMS } from '../permissions.js';
import { countVisibleUsersByDept } from '../scoped.js';

const definition = {
  route: { method: 'GET', path: '/users/dept-counts', summary: '可见用户按所属部门的直属人数' },
  meta: { perm: USER_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.object({
  counts: z.array(z.object({ deptId: z.uuid(), count: z.number().int().nonnegative() })),
  unassigned: z.number().int().nonnegative(),
});

const errors = { ...commonErrorContracts };

export const queryUserDeptCounts = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    const rows = await countVisibleUsersByDept(ctx);
    const result = {
      counts: rows.flatMap((row) => (row.deptId ? [{ deptId: row.deptId, count: row.total }] : [])),
      unassigned: rows.find((row) => row.deptId === null)?.total ?? 0,
    };
    return outputSchema.parse(result);
  });
