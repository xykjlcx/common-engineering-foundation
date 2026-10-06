import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { assertRoleMutable, assertScopePolicyChangeAllowed } from '../domain/role-rules.js';
import { isRoleNameUniqueViolation, roleNameTakenByOther, selectRoleById, updateRoleById } from '../store.js';
import { RoleDataScopeSchema, RoleTypeSchema } from '../schema.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { roleErrors } from '../errors.js';
import { deptErrors } from '../../dept/errors.js';
import { ROLE_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'PATCH', path: '/roles/{id}', summary: '编辑角色资料与授权策略' },
  meta: { perm: ROLE_PERMS.update },
} satisfies SliceDefinition;

const inputSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(64).optional(),
    description: z.string().trim().max(255).optional(),
    enabled: z.boolean().optional(),
    dataScope: RoleDataScopeSchema.optional(),
    deptIds: z.array(z.uuid()).max(500).optional(),
    version: z.number().int().min(0),
  })
  .strict()
  // 可更新字段全 optional，不加这条则 `{ id, version }` 是合法入参：会 200 + version+1 +
  // 落一条 before==after 的审计行 + 发一个 role.updated 事件——什么都没改却推进了乐观锁、
  // 污染了审计链、让下游消费方空跑一次。
  .refine((v) => PATCH_FIELDS.some((f) => v[f] !== undefined), {
    error: '至少需要一个待更新字段',
  });

const outputSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: RoleTypeSchema,
  description: z.string(),
  dataScope: RoleDataScopeSchema,
  deptIds: z.array(z.uuid()),
  enabled: z.boolean(),
  version: z.number().int(),
  updatedAt: z.iso.datetime(),
});

const errors = {
  ...commonErrorContracts,
  ...pick(roleErrors, [
    'role.dept_scope_invalid',
    'role.name_conflict',
    'role.not_found',
    'role.version_conflict',
    'role.system_protected',
  ]),
  ...pick(deptErrors, ['dept.not_found']),
};
const PATCH_FIELDS = ['name', 'description', 'enabled', 'dataScope', 'deptIds'] as const;

export const updateRole = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [target] = await selectRoleById(ctx.db, input.id);
    if (!target) throw new BizError('role.not_found', { id: input.id });

    // 先判内置保护再判版本，避免把不可修改误报成可重试冲突。
    assertRoleMutable(target);
    if (target.version !== input.version) throw new BizError('role.version_conflict', { id: input.id });
    if (input.enabled !== undefined || input.dataScope !== undefined || input.deptIds !== undefined) {
      assertScopePolicyChangeAllowed(ctx, input);
      const nextScope = input.dataScope ?? target.dataScope;
      const nextDeptIds = input.deptIds ?? target.deptIds;
      if (nextScope !== 'custom' && nextDeptIds.length > 0) throw new BizError('role.dept_scope_invalid');
    }
    if (input.name !== undefined && input.name !== target.name) {
      if (await roleNameTakenByOther(ctx.db, input.name, input.id)) {
        throw new BizError('role.name_conflict', { name: input.name });
      }
    }
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      const [updated] = await updateRoleById(ctx, tx, {
        id: input.id,
        version: input.version,
        set: {
          ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          ...(input.dataScope !== undefined ? { dataScope: input.dataScope } : {}),
          ...(input.deptIds !== undefined ? { deptIds: input.deptIds } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
        },
      }).catch((e: unknown) => {
        // 唯一约束处理预查后出现的同名竞态。
        if (isRoleNameUniqueViolation(e)) throw new BizError('role.name_conflict', { name: input.name });
        throw e;
      });
      if (!updated) {
        // 事务内复查走 tx，PGlite 单连接下使用根连接会死锁。
        const [again] = await selectRoleById(tx, input.id);
        throw again
          ? new BizError('role.version_conflict', { id: input.id })
          : new BizError('role.not_found', { id: input.id });
      }
      ctx.audit.capture({
        objectType: 'role',
        objectId: updated.id,
        before: {
          name: target.name,
          description: target.description,
          enabled: target.enabled,
          dataScope: target.dataScope,
          deptIds: target.deptIds,
        },
        after: {
          name: updated.name,
          description: updated.description,
          enabled: updated.enabled,
          dataScope: updated.dataScope,
          deptIds: updated.deptIds,
        },
      });
      const result = {
        id: updated.id,
        name: updated.name,
        type: RoleTypeSchema.parse(updated.type),
        description: updated.description,
        dataScope: RoleDataScopeSchema.parse(updated.dataScope),
        deptIds: updated.deptIds,
        enabled: updated.enabled,
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString(),
      };
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse(result);
    });
    return result;
  });
