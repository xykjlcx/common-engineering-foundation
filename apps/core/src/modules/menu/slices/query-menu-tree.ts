import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { buildMenuTree } from '../domain/menu-tree.js';
import { MenuTypeSchema } from '../schema.js';
import { listMenus } from '../store.js';
import { MenuNodeSchema } from '../tree-contract.js';
import { MENU_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/menus/tree', summary: '菜单管理树（全量，含按钮权限点与隐藏节点）' },
  meta: { perm: MENU_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.object({ nodes: z.array(MenuNodeSchema) });

const errors = { ...commonErrorContracts };

export const queryMenuTree = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    const rows = await listMenus(ctx.db);
    const result = {
      nodes: buildMenuTree(
        rows.map((r) => ({
          id: r.id,
          catalogIdentity: r.catalogIdentity,
          origin: r.catalogIdentity === null ? 'runtime' : 'catalog',
          runtimeManaged: r.catalogIdentity === null,
          parentId: r.parentId,
          subsystemKey: r.subsystemKey,
          type: MenuTypeSchema.parse(r.type),
          label: r.label,
          icon: r.icon,
          path: r.path,
          permCode: r.permCode,
          visible: r.visible,
          sort: r.sort,
          version: r.version,
        })),
      ),
    };
    return result;
  });
