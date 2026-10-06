import { DeleteMenuSchema } from '../contract.js';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { countChildren, deleteMenuById, findMenuById, isParentForeignKeyViolation } from '../store.js';
import { PermissionError, BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { menuErrors } from '../errors.js';
import { MENU_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'DELETE', path: '/menus/{id}', summary: '删除菜单节点（有子节点时拒绝）' },
  meta: {
    perm: MENU_PERMS.delete,
  },
} satisfies SliceDefinition;

const inputSchema = DeleteMenuSchema;

const outputSchema = z.object({ id: z.uuid() });

const errors = {
  ...commonErrorContracts,
  ...pick(menuErrors, ['menu.catalog_owned', 'menu.has_children', 'menu.not_found', 'menu.version_conflict']),
};

export const deleteMenu = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [target] = await findMenuById(ctx.db, input.id);
    if (!target) throw new BizError('menu.not_found', { id: input.id });
    if (target.catalogIdentity !== null || target.type !== 'dir')
      throw new PermissionError({ id: input.id }, 'menu.catalog_owned');

    // 前值快照必须匹配删除版本，避免审计记录与实际删除对象不一致。
    if (target.version !== input.version) throw new BizError('menu.version_conflict', { id: input.id });
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      const children = await countChildren(tx, input.id);
      if (children > 0) throw new BizError('menu.has_children', { id: input.id, children });
      const [deleted] = await deleteMenuById(tx, { id: input.id, version: input.version }).catch(
        (e: unknown) => {
          // 并发新增子节点可能触发 restrict 外键；映射为同一业务冲突。
          if (isParentForeignKeyViolation(e)) throw new BizError('menu.has_children', { id: input.id });
          throw e;
        },
      );
      if (!deleted) {
        // 复查必须走 tx：事务内经 ctx.db（根连接）查询在 PGlite 单连接下直接死锁
        const [again] = await findMenuById(tx, input.id);
        throw again
          ? new BizError('menu.version_conflict', { id: input.id })
          : new BizError('menu.not_found', { id: input.id });
      }
      ctx.audit.capture({
        objectType: 'menu',
        objectId: deleted.id,
        before: { type: target.type, label: target.label, path: target.path, permCode: target.permCode },
        after: null,
      });
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse({ id: deleted.id });
    });
    return result;
  });
