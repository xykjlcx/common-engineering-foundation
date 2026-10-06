import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { assertNoPrivilegeEscalation, type ActorPermissions } from '../../../kernel/escalation.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { assertMenusExist, getPermCodesOfMenus } from '../../menu/api.js';
import { assertRoleMenuScope } from '../domain/role-grants.js';
import { assertRoleMutable, normalizeMenuIds } from '../domain/role-rules.js';
import { BizError, commonErrorContracts, kernelErrors, pick } from '../../../kernel/errors.js';
import { roleErrors } from '../errors.js';
import { menuErrors } from '../../menu/errors.js';
import {
  isRoleMenuReferenceViolation,
  replaceRoleMenus,
  selectMenuIdsOfRoles,
  selectRoleById,
  updateRoleById,
} from '../store.js';
import { ROLE_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/roles/{id}/menus', summary: '分配角色菜单授权（全量替换）' },
  meta: { perm: ROLE_PERMS.grant },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    id: z.uuid(),
    menuIds: z.array(z.uuid()).max(500),
    version: z.number().int().min(0),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid(),
  version: z.number().int(),
  menuIds: z.array(z.uuid()),
});

const errors = {
  ...commonErrorContracts,
  ...pick(roleErrors, [
    'role.menu_assignment_conflict',
    'role.not_found',
    'role.version_conflict',
    'role.system_protected',
  ]),
  ...pick(menuErrors, ['menu.not_found']),
  ...pick(kernelErrors, ['permission.escalation_denied']),
};
/** 区分引用对象消失与角色版本冲突，调用方需重新加载授权目录。 */

export const assignRoleMenus = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const menuIds = normalizeMenuIds(input.menuIds);

    // 先判内置保护再判版本，避免把不可修改误报成可重试冲突。
    const [target] = await selectRoleById(ctx.db, input.id);
    if (!target) throw new BizError('role.not_found', { id: input.id });
    assertRoleMutable(target);
    if (target.version !== input.version) throw new BizError('role.version_conflict', { id: input.id });
    await assertMenusExist(ctx.db, menuIds);

    // 授出权限须属于操作者；全量数据范围不代表超管资格。
    const actor: ActorPermissions = ctx.isSuperuser
      ? { kind: 'all' }
      : { kind: 'set', codes: ctx.permissions };
    assertNoPrivilegeEscalation(actor, await getPermCodesOfMenus(ctx.db, menuIds));
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      // 先推进聚合版本并取得行锁，再替换授权。
      const [updated] = await updateRoleById(ctx, tx, { id: input.id, version: input.version });
      if (!updated) {
        // 事务内复查走 tx，PGlite 单连接下使用根连接会死锁。
        const [again] = await selectRoleById(tx, input.id);
        throw again
          ? new BizError('role.version_conflict', { id: input.id })
          : new BizError('role.not_found', { id: input.id });
      }
      // 持行锁后读取授权前值，使审计对应实际被替换的集合。
      const before = normalizeMenuIds((await selectMenuIdsOfRoles(tx, [input.id])).map((r) => r.menuId));
      await assertRoleMenuScope(txCtx, updated, menuIds);
      await replaceRoleMenus(ctx, tx, { roleId: input.id, menuIds }).catch((e: unknown) => {
        // 映射预查后引用对象被删除的竞态，提示重新加载授权目录。
        if (isRoleMenuReferenceViolation(e))
          throw new BizError('role.menu_assignment_conflict', { id: input.id });
        throw e;
      });
      ctx.audit.capture({
        objectType: 'role',
        objectId: updated.id,
        before: { menuIds: before },
        after: { menuIds },
      });
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse({ id: updated.id, version: updated.version, menuIds });
    });
    return result;
  });
