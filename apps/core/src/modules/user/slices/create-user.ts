import { assertPasswordPolicy } from '../../settings/api.js';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { hashPassword } from '../../../kernel/crypto.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { CreateUserSchema } from '../contract.js';
import { assertUniqueNewUser, createUserInTransaction } from '../domain/user-create.js';
import { UserStatusSchema } from '../schema.js';
import { commonErrorContracts, kernelErrors, pick } from '../../../kernel/errors.js';
import { postErrors } from '../../post/errors.js';
import { userErrors } from '../errors.js';
import { deptErrors } from '../../dept/errors.js';
import { roleErrors } from '../../role/errors.js';
import { fileErrors } from '../../file/errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users', summary: '新建用户' },
  meta: {
    perm: USER_PERMS.create,
  },
} satisfies SliceDefinition;

const inputSchema = CreateUserSchema;

const outputSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string(),
  status: UserStatusSchema,
  version: z.number().int(),
  createdAt: z.iso.datetime(),
});

const errors = {
  ...commonErrorContracts,
  ...pick(postErrors, ['post.not_found', 'post.disabled']),
  ...pick(userErrors, [
    'user.username_conflict',
    'user.email_conflict',
    'user.employee_no_conflict',
    'user.manager_not_found',
    'user.role_grant_conflict',
    'user.manager_self_forbidden',
    'user.not_found',
    'user.system_admin_protected',
  ]),
  ...pick(deptErrors, ['dept.not_found', 'dept.disabled']),
  ...pick(roleErrors, ['role.not_found']),
  ...pick(fileErrors, ['file.avatar.not_found']),
  ...pick(kernelErrors, ['permission.escalation_denied', 'permission.self_grant_forbidden']),
};

export const createUser = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    await assertPasswordPolicy(ctx.db, input.password);
    await assertUniqueNewUser(ctx, input);

    // 哈希在写事务前计算，唯一性最终仍由数据库约束保证。
    const passwordHash = await hashPassword(input.password);
    const result = await runCommand(ctx, async (txCtx) => {
      const created = await createUserInTransaction(txCtx, input, passwordHash);
      // 返回结构失效也必须回滚，避免已创建却向客户端报告失败。
      const value = outputSchema.parse(created.value);
      const result = { value, audit: created.audit };
      return result;
    });

    ctx.audit.capture(result.audit);

    const response = result.value;
    return response;
  });
