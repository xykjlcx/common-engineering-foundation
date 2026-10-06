import * as z from 'zod';

export const ROLE_DATA_SCOPES = ['all', 'self', 'dept', 'deptAndChildren', 'custom'] as const;
export const RoleDataScopeSchema = z.enum(ROLE_DATA_SCOPES);
export const ROLE_TYPES = ['system', 'custom'] as const;
export const RoleTypeSchema = z.enum(ROLE_TYPES);
export type RoleType = z.infer<typeof RoleTypeSchema>;
export const RoleViewSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: RoleTypeSchema,
  description: z.string(),
  dataScope: RoleDataScopeSchema,
  deptIds: z.array(z.uuid()),
  enabled: z.boolean(),
  version: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});
/** 与 user.list 同形态：`字段:方向`，缺省按创建时间倒序。 */
export const RoleSortSchema = z.templateLiteral([
  z.enum(['name', 'type', 'createdAt']),
  ':',
  z.enum(['asc', 'desc']),
]);
export const RolePageSchema = z.object({
  list: z.array(RoleViewSchema.extend({ memberCount: z.number().int().min(0) })),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const RoleDetailSchema = RoleViewSchema.extend({
  menuIds: z.array(z.uuid()),
  memberCount: z.number().int().min(0).nullable(),
});
export const CreateRoleSchema = z
  .object({
    name: z.string().trim().min(1).max(64),
    description: z.string().trim().max(255).default(''),
    dataScope: RoleDataScopeSchema.default('self'),
    deptIds: z.array(z.uuid()).max(500).default([]),
    enabled: z.boolean().default(true),
  })
  .strict();
export const GrantMenuSchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  label: z.record(z.string(), z.string()),
  type: z.enum(['dir', 'menu', 'action']),
  permCode: z.string().nullable(),
});
