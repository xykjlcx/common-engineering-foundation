import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { MenuTypeSchema } from '../schema.js';
import { listMenus } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/menus/navigation', summary: '当前用户导航（平面节点）' },
  meta: { perm: 'none', permNoneReason: '已认证会话自己的可访问导航；仅返回当前权限对应节点及其展示祖先' },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.array(
  z.object({
    id: z.uuid(),
    parentId: z.uuid().nullable(),
    subsystemKey: z.string(),
    type: MenuTypeSchema,
    catalogIdentity: z.string().nullable(),
    origin: z.enum(['catalog', 'runtime']),
    runtimeManaged: z.boolean(),
    label: z.record(z.string(), z.string()),
    icon: z.string().nullable(),
    path: z.string().nullable(),
    permCode: z.string().nullable(),
    visible: z.boolean(),
    sort: z.number().int(),
    version: z.number().int(),
  }),
);

const errors = { ...commonErrorContracts };

export const queryNavigation = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    const rows = await listMenus(ctx.db);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const included = new Set<string>();
    const canSee = (row: (typeof rows)[number]) => {
      if (!row.visible) return false;
      if (row.catalogIdentity !== null && row.type === 'menu' && row.permCode === null) return true;
      if (row.permCode === null) return false;
      if (!ctx.availablePermissions.has(row.permCode)) return false;
      return ctx.isSuperuser || ctx.permissions.has(row.permCode);
    };
    for (const row of rows) {
      // 超管可以绕过角色授权，不能绕过功能是否已由后端实现。目录只随可访问子节点带回。
      if (!canSee(row)) continue;
      const chain = [row];
      const seen = new Set([row.id]);
      let parentId = row.parentId;
      let valid = true;
      while (parentId !== null) {
        const parent = byId.get(parentId);
        if (!parent || seen.has(parent.id) || (parent.type === 'menu' ? !canSee(parent) : !parent.visible)) {
          valid = false;
          break;
        }
        seen.add(parent.id);
        chain.push(parent);
        parentId = parent.parentId;
      }
      if (valid) for (const ancestor of chain) included.add(ancestor.id);
    }
    const result = rows
      .filter((row) => included.has(row.id))
      .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
      .map((row) => ({
        ...row,
        type: MenuTypeSchema.parse(row.type),
        origin: row.catalogIdentity === null ? ('runtime' as const) : ('catalog' as const),
        runtimeManaged: row.catalogIdentity === null,
      }));
    return result;
  });
