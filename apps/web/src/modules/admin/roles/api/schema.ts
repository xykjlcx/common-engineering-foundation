import {
  CreateRoleSchema as CoreCreateRoleSchema,
  RoleViewSchema,
  RolePageSchema,
  RoleDataScopeSchema,
} from '@keel/core/role-contract';
import { z } from 'zod';

export const RoleTypeSchema = RoleViewSchema.shape.type;
export const RoleSchema = RoleViewSchema.pick({
  id: true,
  name: true,
  type: true,
  description: true,
})
  .extend({
    memberCount: RolePageSchema.shape.list.element.shape.memberCount.optional(),
    enabled: RoleViewSchema.shape.enabled.optional(),
  })
  .transform(({ description, ...role }) => ({ ...role, desc: description }));
export const CreateRoleSchema = z.object({
  name: CoreCreateRoleSchema.shape.name,
  desc: CoreCreateRoleSchema.shape.description.optional(),
});
export const PermissionActionSchema = z.object({
  code: z.string().optional(),
  id: z.string(),
  label: z.string(),
});
export const PermissionResourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  code: z.string(),
  actions: z.array(PermissionActionSchema),
  ancestorIds: z.array(z.string()).optional(),
});
export const PermissionTreeGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  resources: z.array(PermissionResourceSchema),
});
export const RolePermissionMapSchema = z.record(z.string(), z.array(z.string()));
export const RoleMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  deptLabel: z.string(),
  title: z.string(),
});
export const DataScopeSchema = RoleDataScopeSchema;
export const RoleDataPermissionSchema = z
  .object({
    defaultScope: DataScopeSchema,
    defaultDepartmentIds: z.array(z.string()),
    resources: z.object({}).strict(),
  })
  .strict();
export const RoleAuditLogKindSchema = z.enum(['create', 'edit', 'grant', 'remove', 'dataScope']);
export const RoleAuditLogSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  operator: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  kind: RoleAuditLogKindSchema,
  change: z.string(),
});

export type RoleType = z.infer<typeof RoleTypeSchema>;
export type RoleDto = z.infer<typeof RoleSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type PermissionResourceDto = z.infer<typeof PermissionResourceSchema>;
export type PermissionTreeGroupDto = z.infer<typeof PermissionTreeGroupSchema>;
export type RolePermissionMap = z.infer<typeof RolePermissionMapSchema>;
export type RoleMemberDto = z.infer<typeof RoleMemberSchema>;
export type DataScope = z.infer<typeof DataScopeSchema>;
export type RoleDataPermission = z.infer<typeof RoleDataPermissionSchema>;
export type RoleAuditLogKind = z.infer<typeof RoleAuditLogKindSchema>;
export type RoleAuditLogDto = z.infer<typeof RoleAuditLogSchema>;
