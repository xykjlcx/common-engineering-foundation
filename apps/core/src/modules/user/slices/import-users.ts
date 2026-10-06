import { runCommand } from '../../../kernel/command.js';
import { hashPassword } from '../../../kernel/crypto.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { CreateUserSchema } from '../contract.js';
import { createUserInTransaction } from '../domain/user-create.js';
import { importValidationError, previewNewUsers } from '../domain/user-import.js';
import { UserImportInputSchema, UserImportResultSchema } from '../import-contract.js';
import { commonErrorContracts, kernelErrors, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { deptErrors } from '../../dept/errors.js';
import { roleErrors } from '../../role/errors.js';
import { fileErrors } from '../../file/errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/import', summary: '原子导入新用户（最多100行）' },
  meta: {
    perm: USER_PERMS.import,
  },
} satisfies SliceDefinition;

const inputSchema = UserImportInputSchema;

const outputSchema = UserImportResultSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, [
    'user.import_invalid',
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

export const importUsers = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const preview = await runCommand(ctx, async (txCtx) => {
      const result = await previewNewUsers(txCtx, input.rows);
      return result;
    });
    if (!preview.valid) throw importValidationError(preview.rows);

    // 顺序散列限制 CPU/内存占用，准备阶段不占写事务。
    const rows = preview.inputs.map((row) => CreateUserSchema.parse(row));
    const hashes: string[] = [];
    for (const row of rows) {
      const hash = await hashPassword(row.password);
      hashes.push(hash);
    }
    const result = await runCommand(ctx, async (txCtx) => {
      // 准备期间关联事实可能变化；写入前在同一事务内重新检查整批。
      const current = await previewNewUsers(txCtx, rows);
      if (!current.valid) throw importValidationError(current.rows);
      const created = [];
      for (const [index, row] of rows.entries()) {
        const hash = hashes[index];
        if (!hash) throw new Error('missing prepared password hash');
        const user = await createUserInTransaction(txCtx, row, hash);
        created.push(user);
      }
      // 整批输出校验也属于提交条件，任何一行投影失效都整体回滚。
      const values = created.map((user, index) => ({ row: index + 1, id: user.value.id }));
      const response = outputSchema.parse({ created: values });
      const audits = created.map((user) => user.audit);
      const result = { response, audits };
      return result;
    });

    ctx.audit.captureMany(result.audits);

    const response = result.response;
    return response;
  });
