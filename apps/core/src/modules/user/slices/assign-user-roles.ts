import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { replaceUserRoles } from '../domain/user-grants.js';
import { appUsers } from '../schema.js';
import { bumpUserVersionScoped, visibleUsers } from '../scoped.js';
import { BizError, commonErrorContracts, kernelErrors, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { roleErrors } from '../../role/errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/{id}/roles', summary: '分配用户角色（全量替换）' },
  meta: {
    perm: USER_PERMS.assignRoles,
  },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    id: z.uuid(),
    roleIds: z.array(z.uuid()).max(50),
    version: z.number().int().min(0),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid(),
  roleIds: z.array(z.uuid()),
  version: z.number().int(),
  updatedAt: z.iso.datetime(),
});

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, [
    'user.not_found',
    'user.version_conflict',
    'user.role_grant_conflict',
    'user.system_admin_protected',
  ]),
  ...pick(kernelErrors, ['permission.escalation_denied', 'permission.self_grant_forbidden']),
  ...pick(roleErrors, ['role.not_found']),
};
// 全量替换授权与用户版本同事务；所有授予规则收口在 user-grants 能力。

// 授权外键失败后事务已 aborted，不能补查缺失明细，返回可重试冲突。

export const assignUserRoles = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const roleIds = [...new Set(input.roleIds)].sort();
    const [target] = await visibleUsers(ctx, { where: eq(appUsers.id, input.id) }).limit(1);
    if (!target) throw new BizError('user.not_found', { id: input.id });
    if (target.version !== input.version) throw new BizError('user.version_conflict', { id: input.id });
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      const [touched] = await bumpUserVersionScoped(ctx, tx, { id: input.id, version: input.version });
      if (!touched) {
        // 复查必须带同一 scope 条件，且必须走 tx：按裸 ID 复查会让无权限者用 409/404 差异
        // 探测对象存在性；经 ctx.db（根连接）复查在 PGlite 单连接下直接死锁
        const [again] = await visibleUsers(txCtx, { where: eq(appUsers.id, input.id) }).limit(1);
        throw again
          ? new BizError('user.version_conflict', { id: input.id })
          : new BizError('user.not_found', { id: input.id });
      }
      const { beforeRoleIds } = await replaceUserRoles(txCtx, input.id, roleIds);
      ctx.audit.capture({
        objectType: 'user',
        objectId: touched.id,
        before: { roleIds: beforeRoleIds },
        after: { roleIds },
      });
      const result = {
        id: touched.id,
        roleIds,
        version: touched.version,
        updatedAt: touched.updatedAt.toISOString(),
      };
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse(result);
    });
    return result;
  });
