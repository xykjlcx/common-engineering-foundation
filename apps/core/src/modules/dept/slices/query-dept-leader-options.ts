import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { getDepartmentLeaderOptions } from '../../user/api.js';
import { DeptLeaderQuerySchema, DeptLeaderSchema } from '../contract.js';

const definition = {
  route: { method: 'GET', path: '/depts/leader-options', summary: '部门负责人候选（姓名/工号分页搜索）' },
  meta: {
    perm: 'none',
    permNoneReason: '组织写入只允许系统管理员，基座 superuserOnly 执行资格；仅投影真实负责人引用。',
    superuserOnly: true,
  },
} satisfies SliceDefinition;

const inputSchema = DeptLeaderQuerySchema;

const outputSchema = z.object({
  list: z.array(DeptLeaderSchema),
  total: z.number().int(),
  selected: DeptLeaderSchema.nullable(),
});

const errors = { ...commonErrorContracts };

export const queryDeptLeaderOptions = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    return getDepartmentLeaderOptions(ctx.db, input);
  });
