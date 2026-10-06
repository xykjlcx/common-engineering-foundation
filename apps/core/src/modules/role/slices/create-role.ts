import * as z from 'zod';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { CreateRoleSchema } from '../contract.js';
import { assertRoleCreateScopeAllowed } from '../domain/role-rules.js';
import {
  isRoleNameUniqueViolation,
  replaceRoleDepartments,
  roleRecordColumns,
  roleNameTaken,
} from '../store.js';
import { RoleDataScopeSchema, roles, RoleTypeSchema } from '../schema.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { roleErrors } from '../errors.js';
import { deptErrors } from '../../dept/errors.js';
import { ROLE_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'POST', path: '/roles', summary: '新建角色（API 面恒为 custom 类型）' },
  meta: {
    perm: ROLE_PERMS.create,
  },
} satisfies SliceDefinition;

const inputSchema = CreateRoleSchema;

const outputSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: RoleTypeSchema,
  description: z.string(),
  dataScope: RoleDataScopeSchema,
  deptIds: z.array(z.uuid()),
  enabled: z.boolean(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
});

const errors = {
  ...commonErrorContracts,
  ...pick(roleErrors, ['role.dept_scope_invalid', 'role.name_conflict']),
  ...pick(deptErrors, ['dept.not_found']),
};

export const createRole = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    assertRoleCreateScopeAllowed(ctx, input);
    if (input.dataScope !== 'custom' && input.deptIds.length > 0)
      throw new BizError('role.dept_scope_invalid');
    if (await roleNameTaken(ctx.db, input.name)) {
      throw new BizError('role.name_conflict', { name: input.name });
    }
    const now = ctx.clock.now();
    const result = await runCommand(ctx, async (txCtx) => {
      const tx = txCtx.db;
      const deptIds = [...new Set(input.deptIds)].sort();
      const [created] = await tx
        .insert(roles)
        .values({
          id: ctx.idgen(),
          name: input.name,
          // API 只创建 custom 角色，避免运行期制造受保护的内置角色。
          type: 'custom',
          description: input.description,
          dataScope: input.dataScope,
          enabled: input.enabled,
          version: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning(roleRecordColumns)
        .catch((e: unknown) => {
          // 唯一约束处理预查后出现的同名竞态。
          if (isRoleNameUniqueViolation(e)) throw new BizError('role.name_conflict', { name: input.name });
          throw e;
        });
      // INSERT 无返回行属于异常，不映射成目标不存在。
      if (!created) throw new Error('role insert returned no row');
      await replaceRoleDepartments(tx, created.id, input.deptIds);
      ctx.audit.capture({
        objectType: 'role',
        objectId: created.id,
        before: null,
        after: { name: created.name, type: created.type, description: created.description },
      });
      const result = {
        id: created.id,
        name: created.name,
        type: RoleTypeSchema.parse(created.type),
        description: created.description,
        dataScope: RoleDataScopeSchema.parse(created.dataScope),
        deptIds,
        enabled: created.enabled,
        version: created.version,
        createdAt: created.createdAt.toISOString(),
      };
      // 成功响应也是提交条件；投影失效时回滚本次写入。
      return outputSchema.parse(result);
    });
    return result;
  });
