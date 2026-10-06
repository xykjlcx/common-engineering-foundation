import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BatchTargetsSchema } from '../batch-contract.js';
import { replaceUserRoles } from '../domain/user-grants.js';
import { appUsers } from '../schema.js';
import { bumpUserVersionScoped, roleIdsOfUserRaw, visibleUsers } from '../scoped.js';
import { BizError, commonErrorContracts, kernelErrors, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { roleErrors } from '../../role/errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/users/batch/roles', summary: '整批增补/替换/移除/清空角色（原子提交）' },
  meta: {
    perm: USER_PERMS.assignRoles,
  },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    targets: BatchTargetsSchema,
    mode: z.enum(['add', 'replace', 'remove', 'clear']),
    roleIds: z.array(z.uuid()).max(50),
  })
  .strict()
  .refine((input) => input.mode !== 'clear' || input.roleIds.length === 0, { error: '清空授权不能携带角色' });

const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      roleIds: z.array(z.uuid()),
      version: z.number().int(),
      updatedAt: z.iso.datetime(),
    }),
  ),
});

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, [
    'user.not_found',
    'user.too_many_roles',
    'user.version_conflict',
    'user.role_grant_conflict',
    'user.system_admin_protected',
  ]),
  ...pick(kernelErrors, ['permission.escalation_denied', 'permission.self_grant_forbidden']),
  ...pick(roleErrors, ['role.not_found']),
};

export const batchUserRoles = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      const changes = [];
      for (const target of input.targets) {
        const [touched] = await bumpUserVersionScoped(ctx, tx, target);
        if (!touched) {
          const [again] = await visibleUsers(txCtx, { where: eq(appUsers.id, target.id) }).limit(1);
          throw new BizError(again ? 'user.version_conflict' : 'user.not_found', { id: target.id });
        }
        const oldIds = await roleIdsOfUserRaw(tx, target.id);
        const wanted =
          input.mode === 'clear'
            ? []
            : input.mode === 'replace'
              ? input.roleIds
              : input.mode === 'add'
                ? [...oldIds, ...input.roleIds]
                : oldIds.filter((id) => !input.roleIds.includes(id));
        if (new Set(wanted).size > 50)
          throw new BizError('user.too_many_roles', { id: target.id, maximum: 50 });
        const { beforeRoleIds, roleIds } = await replaceUserRoles(txCtx, target.id, wanted);
        changes.push({
          result: {
            id: target.id,
            roleIds,
            version: touched.version,
            updatedAt: touched.updatedAt.toISOString(),
          },
          audit: {
            objectType: 'user',
            objectId: target.id,
            before: { roleIds: beforeRoleIds },
            after: { roleIds },
          },
        });
      }
      // 先验证整批响应；任何一项投影失效都不能提交前面的写入。
      const response = outputSchema.parse({ items: changes.map((change) => change.result) });
      const audits = changes.map((change) => change.audit);
      return { response, audits };
    });

    ctx.audit.captureMany(result.audits);

    const response = result.response;
    return response;
  });
