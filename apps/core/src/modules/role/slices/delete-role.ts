import { and, eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { assertRoleMutable } from '../domain/role-rules.js';
import { isRoleInUseViolation, roleColumns, selectRoleById } from '../store.js';
import { roles } from '../schema.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { roleErrors } from '../errors.js';
import { ROLE_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'DELETE', path: '/roles/{id}', summary: '删除角色（仍被用户占用时拒绝）' },
  meta: { perm: ROLE_PERMS.delete },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid(), version: z.number().int().min(0) }).strict();

const outputSchema = z.object({ id: z.uuid() });

const errors = {
  ...commonErrorContracts,
  ...pick(roleErrors, ['role.in_use', 'role.not_found', 'role.version_conflict', 'role.system_protected']),
};
// 角色被用户引用时由 restrict 外键拒删；菜单授权随角色删除级联清空。

export const deleteRole = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [target] = await selectRoleById(ctx.db, input.id);
    if (!target) throw new BizError('role.not_found', { id: input.id });
    assertRoleMutable(target);
    if (target.version !== input.version) throw new BizError('role.version_conflict', { id: input.id });
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      const [deleted] = await tx
        .delete(roles)
        .where(and(eq(roles.id, input.id), eq(roles.version, input.version)))
        .returning(roleColumns)
        .catch((e: unknown) => {
          // 把引用外键冲突映射为角色在用。
          if (isRoleInUseViolation(e)) throw new BizError('role.in_use', { id: input.id });
          throw e;
        });
      if (!deleted) {
        // ⚠️ 复查必须走 tx（不是 ctx.db）：事务内经根连接查询在 PGlite 单连接下直接死锁
        const [again] = await selectRoleById(tx, input.id);
        throw again
          ? new BizError('role.version_conflict', { id: input.id })
          : new BizError('role.not_found', { id: input.id });
      }
      ctx.audit.capture({
        objectType: 'role',
        objectId: deleted.id,
        before: { name: deleted.name, type: deleted.type, description: deleted.description },
        after: null,
      });
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse({ id: deleted.id });
    });
    return result;
  });
