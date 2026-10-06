import { CreateMenuSchema } from '../contract.js';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { MenuTypeSchema } from '../schema.js';
import { insertMenu } from '../store.js';
import { MENU_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/menus', summary: '新建运行期展示目录' },
  meta: {
    perm: MENU_PERMS.create,
  },
} satisfies SliceDefinition;

const inputSchema = CreateMenuSchema;

const outputSchema = z.object({
  id: z.uuid(),
  catalogIdentity: z.null(),
  origin: z.literal('runtime'),
  runtimeManaged: z.literal(true),
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
  createdAt: z.iso.datetime(),
});

const errors = { ...commonErrorContracts };

export const createMenu = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：menu 非归属敏感表；顶层目录/null路径/无权限码由严格契约与构造值保证。
    const parentId = input.parentId;
    const permCode = null;
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      const [created] = await insertMenu(ctx, tx, {
        parentId,
        subsystemKey: input.subsystemKey,
        type: input.type,
        label: input.label,
        icon: input.icon,
        path: null,
        permCode,
        visible: input.visible,
        sort: input.sort,
      });
      // INSERT 无返回行属于异常，不映射成目标不存在。
      if (!created) throw new Error('menu insert returned no row');
      ctx.audit.capture({
        objectType: 'menu',
        objectId: created.id,
        before: null,
        after: { type: created.type, label: created.label, path: created.path, permCode: created.permCode },
      });
      const result = {
        id: created.id,
        catalogIdentity: null,
        origin: 'runtime' as const,
        runtimeManaged: true as const,
        parentId: created.parentId,
        subsystemKey: created.subsystemKey,
        type: MenuTypeSchema.parse(created.type),
        label: created.label,
        icon: created.icon,
        path: created.path,
        permCode: created.permCode,
        visible: created.visible,
        sort: created.sort,
        version: created.version,
        createdAt: created.createdAt.toISOString(),
      };
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse(result);
    });
    return result;
  });
