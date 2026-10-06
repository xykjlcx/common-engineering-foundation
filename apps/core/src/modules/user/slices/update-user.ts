import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { bindAvatar } from '../../file/api.js';
import { UpdateUserSchema } from '../contract.js';
import { replaceUserRoles } from '../domain/user-grants.js';
import { assertProfileReferences } from '../domain/user-profile.js';
import { appUsers, UserStatusSchema } from '../schema.js';
import { BizError, commonErrorContracts, kernelErrors, pick } from '../../../kernel/errors.js';
import { postErrors } from '../../post/errors.js';
import { userErrors } from '../errors.js';
import { deptErrors } from '../../dept/errors.js';
import { fileErrors } from '../../file/errors.js';
import { roleErrors } from '../../role/errors.js';
import {
  emailTakenByOther,
  isEmailUniqueViolation,
  isEmployeeNoUniqueViolation,
  updateUserScoped,
  USER_PROFILE_PATCH_KEYS,
  visibleUsers,
} from '../scoped.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'PATCH', path: '/users/{id}', summary: '编辑用户资料' },
  meta: { perm: USER_PERMS.update },
} satisfies SliceDefinition;

const inputSchema = UpdateUserSchema;

const outputSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string(),
  status: UserStatusSchema,
  version: z.number().int(),
  updatedAt: z.iso.datetime(),
});

const errors = {
  ...commonErrorContracts,
  ...pick(postErrors, ['post.not_found', 'post.disabled']),
  ...pick(userErrors, [
    'user.email_conflict',
    'user.employee_no_conflict',
    'user.not_found',
    'user.version_conflict',
    'user.manager_not_found',
    'user.manager_self_forbidden',
    'user.role_grant_conflict',
    'user.system_admin_protected',
  ]),
  ...pick(deptErrors, ['dept.disabled', 'dept.not_found']),
  ...pick(fileErrors, ['file.avatar.not_found']),
  ...pick(kernelErrors, ['permission.escalation_denied', 'permission.self_grant_forbidden']),
  ...pick(roleErrors, ['role.not_found']),
};

export const updateUser = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [target] = await visibleUsers(ctx, { where: eq(appUsers.id, input.id) }).limit(1);
    if (!target) throw new BizError('user.not_found', { id: input.id });

    // 更新版本须与审计前值一致，避免两个变更声称同一旧快照。
    if (target.version !== input.version) throw new BizError('user.version_conflict', { id: input.id });
    if (input.email !== undefined && input.email !== null && input.email !== target.email) {
      if (await emailTakenByOther(ctx.db, input.email, input.id)) {
        throw new BizError('user.email_conflict', { email: input.email });
      }
    }
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      await assertProfileReferences(txCtx, input, input.id);
      const allowed = new Set<string>(USER_PROFILE_PATCH_KEYS);
      const [updated] = await updateUserScoped(ctx, tx, {
        id: input.id,
        version: input.version,
        set: Object.fromEntries(
          Object.entries(input).filter(([key, value]) => allowed.has(key) && value !== undefined),
        ),
      }).catch((e: unknown) => {
        // 唯一约束处理预查后出现的邮箱占用竞态。
        if (isEmployeeNoUniqueViolation(e)) throw new BizError('user.employee_no_conflict');
        if (isEmailUniqueViolation(e)) throw new BizError('user.email_conflict', { email: input.email });
        throw e;
      });
      if (!updated) {
        // 复查必须带同一 scope 条件——按裸 ID 复查会让无权限者用 409/404 差异探测对象存在性。
        // 且必须走 tx：事务内经 ctx.db（根连接）查询在 PGlite 单连接下直接死锁
        const [again] = await visibleUsers(txCtx, { where: eq(appUsers.id, input.id) }).limit(1);
        throw again
          ? new BizError('user.version_conflict', { id: input.id })
          : new BizError('user.not_found', { id: input.id });
      }
      if (input.avatarId !== undefined) await bindAvatar(txCtx, input.avatarId, input.id);
      const grants =
        input.roleIds !== undefined ? await replaceUserRoles(txCtx, input.id, input.roleIds) : undefined;
      const previous = new Map(Object.entries(target));
      const next = new Map(Object.entries(updated));
      const changedFields = Object.keys(input).filter(
        (key) =>
          key !== 'id' &&
          key !== 'version' &&
          key !== 'roleIds' &&
          JSON.stringify(previous.get(key)) !== JSON.stringify(next.get(key)),
      );
      const before: Record<string, unknown> = Object.fromEntries(
        changedFields.map((key) => [key, previous.get(key)]),
      );
      const after: Record<string, unknown> = Object.fromEntries(
        changedFields.map((key) => [key, next.get(key)]),
      );
      if (grants && JSON.stringify(grants.beforeRoleIds) !== JSON.stringify(grants.roleIds)) {
        before.roleIds = grants.beforeRoleIds;
        after.roleIds = grants.roleIds;
      }
      ctx.audit.capture({
        objectType: 'user',
        objectId: updated.id,
        before,
        after,
      });
      const result = {
        id: updated.id,
        username: updated.username,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        status: UserStatusSchema.parse(updated.status),
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString(),
      };
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse(result);
    });
    return result;
  });
