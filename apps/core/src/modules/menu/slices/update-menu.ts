import { UpdateMenuSchema } from '../contract.js';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { assertMenuFieldsMatchType, assertMenuHierarchy } from '../domain/menu-rules.js';
import { MenuTypeSchema } from '../schema.js';
import { findMenuById, isParentForeignKeyViolation, updateMenuById } from '../store.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { menuErrors } from '../errors.js';
import { MENU_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'PATCH', path: '/menus/{id}', summary: '编辑菜单节点' },
  meta: {
    perm: MENU_PERMS.update,
  },
} satisfies SliceDefinition;

const inputSchema = UpdateMenuSchema;

const outputSchema = z.object({
  id: z.uuid(),
  catalogIdentity: z.string().nullable(),
  origin: z.enum(['catalog', 'runtime']),
  runtimeManaged: z.boolean(),
  parentId: z.uuid().nullable(),
  subsystemKey: z.string(),
  type: MenuTypeSchema,
  label: z.record(z.string(), z.string()),
  icon: z.string().nullable(),
  path: z.string().nullable(),
  permCode: z.string().nullable(),
  visible: z.boolean(),
  sort: z.number().int(),
  version: z.number().int(),
  updatedAt: z.iso.datetime(),
});

const errors = {
  ...commonErrorContracts,
  ...pick(menuErrors, [
    'menu.not_found',
    'menu.parent_invalid',
    'menu.parent_not_found',
    'menu.version_conflict',
    'menu.field_type_mismatch',
  ]),
};
// 代码目录拥有路由/权限/类型/子系统身份；运行期只编辑展示与合法分组。

export const updateMenu = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [target] = await findMenuById(ctx.db, input.id);
    if (!target) throw new BizError('menu.not_found', { id: input.id });

    // 前值快照必须匹配更新版本，避免审计失真。
    if (target.version !== input.version) throw new BizError('menu.version_conflict', { id: input.id });

    // 字段-类型匹配必须拿**合并后的终值**判：PATCH 下未提交的字段取库里现值，

    // 否则"只改标签"每次都会被判成"页面没有 path"
    assertMenuFieldsMatchType(MenuTypeSchema.parse(target.type), {
      path: target.path,
      permCode: target.permCode,
    });
    if (input.parentId !== undefined) {
      const [parent] = input.parentId === null ? [] : await findMenuById(ctx.db, input.parentId);
      if (input.parentId !== null && !parent)
        throw new BizError('menu.parent_not_found', { parentId: input.parentId });
      assertMenuHierarchy(
        MenuTypeSchema.parse(target.type),
        parent ? { type: MenuTypeSchema.parse(parent.type) } : null,
      );
      if (parent && parent.subsystemKey !== target.subsystemKey)
        throw new BizError('menu.parent_invalid', { reason: 'subsystem_mismatch' });
    }
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      const [updated] = await updateMenuById(ctx, tx, {
        id: input.id,
        version: input.version,
        set: {
          ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.visible !== undefined ? { visible: input.visible } : {}),
          ...(input.sort !== undefined ? { sort: input.sort } : {}),
        },
      }).catch((error: unknown) => {
        if (isParentForeignKeyViolation(error))
          throw new BizError('menu.parent_not_found', { parentId: input.parentId });
        throw error;
      });
      if (!updated) {
        // 事务内复查走 tx，PGlite 单连接下使用根连接会死锁。
        const [again] = await findMenuById(tx, input.id);
        throw again
          ? new BizError('menu.version_conflict', { id: input.id })
          : new BizError('menu.not_found', { id: input.id });
      }
      ctx.audit.capture({
        objectType: 'menu',
        objectId: updated.id,
        before: {
          parentId: target.parentId,
          label: target.label,
          path: target.path,
          permCode: target.permCode,
          visible: target.visible,
          sort: target.sort,
        },
        after: {
          parentId: updated.parentId,
          label: updated.label,
          path: updated.path,
          permCode: updated.permCode,
          visible: updated.visible,
          sort: updated.sort,
        },
      });
      const result = {
        id: updated.id,
        catalogIdentity: updated.catalogIdentity,
        origin: updated.catalogIdentity === null ? 'runtime' : 'catalog',
        runtimeManaged: updated.catalogIdentity === null,
        parentId: updated.parentId,
        subsystemKey: updated.subsystemKey,
        type: MenuTypeSchema.parse(updated.type),
        label: updated.label,
        icon: updated.icon,
        path: updated.path,
        permCode: updated.permCode,
        visible: updated.visible,
        sort: updated.sort,
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString(),
      };
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse(result);
    });
    return result;
  });
