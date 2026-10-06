import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { getGrantMenuCatalog } from '../../menu/api.js';
import { GrantMenuSchema } from '../contract.js';
import { ROLE_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/roles/grant-catalog', summary: '当前操作者可授予的菜单目录' },
  meta: { perm: ROLE_PERMS.grant },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.array(GrantMenuSchema);

const errors = { ...commonErrorContracts };

export const queryRoleGrantCatalog = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    const catalog = await getGrantMenuCatalog(ctx.db);
    return catalog.filter((node) => ctx.isSuperuser || !node.permCode || ctx.permissions.has(node.permCode));
  });
