import { QuerySchemeSchema, SchemeFieldsSchema, SchemeChangesSchema } from '@keel/core/query-scheme-contract';
import { UserFiltersJsonSchema } from '@keel/core/user-filter-contract';
import { z } from 'zod';
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserViewSchema,
  UserDetailViewSchema,
  UserProfileSchema,
  EmploymentStatusSchema,
  UserLoginLogSchema,
  UserOperationLogSchema,
} from '@keel/core/user-contract';
export { CreateUserSchema, UpdateUserSchema };
export type PageResult<T> = { list: T[]; total: number };
// 仅做 UI 命名转换；nullable、版本和历史事实均来自后端公开契约。
function userView(user: z.infer<typeof UserViewSchema>) {
  const { username, accountStatus, employmentStatus, ...profile } = user;
  return { ...profile, account: username, enabled: accountStatus === 'enabled', status: employmentStatus };
}
export const UserSchema = UserViewSchema.transform(userView);
export const UserDetailSchema = UserDetailViewSchema.transform((user) => ({
  ...userView(user),
  managerName: user.managerName,
  createdBy: user.createdBy,
  createdByName: user.createdByName,
  lastLoginIp: user.lastLoginIp,
  roleGrants: user.roleGrants,
  permissionChanges: user.permissionChanges,
  effectivePermissions: user.effectivePermissions,
  effectivePermissionLabels: user.effectivePermissionLabels,
  scopeSources: user.scopeSources,
  subsystemKeys: user.subsystemKeys,
}));
export const UsersPageSchema = z.object({
  list: z.array(UserSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const UserStatusSchema = EmploymentStatusSchema;
export const GenderSchema = UserProfileSchema.shape.gender;
export const EmploymentTypeSchema = UserProfileSchema.shape.employmentType;
export const DataScopeSchema = z.enum(['self', 'dept', 'deptAndSub', 'all', 'custom']);
export type DataScope = z.infer<typeof DataScopeSchema>;
export const RoleGrantSchema = UserDetailViewSchema.shape.roleGrants.element;
export const PermissionChangeSchema = UserDetailViewSchema.shape.permissionChanges.element;
export const LoginRecordSchema = UserLoginLogSchema;
export const OperationLogSchema = UserOperationLogSchema;
export const UserFormSchema = CreateUserSchema.required();
export type UserFormInput = z.infer<typeof UserFormSchema>;
export type CreateUserInput = z.input<typeof CreateUserSchema>;
export type UpdateUserInput = z.input<typeof UpdateUserSchema>;

export const FilterSchemeSchema = QuerySchemeSchema.omit({ resource: true });
export const FilterSchemesSchema = z.array(FilterSchemeSchema);
export const CreateFilterSchemeSchema = SchemeFieldsSchema.extend({ filters: UserFiltersJsonSchema });
export const UpdateFilterSchemeSchema = SchemeChangesSchema.safeExtend({
  filters: UserFiltersJsonSchema.optional(),
});

export type UserDto = z.infer<typeof UserSchema>;
export type UserDetailDto = z.infer<typeof UserDetailSchema>;
export type UsersPageDto = z.infer<typeof UsersPageSchema>;
export type RoleGrantDto = z.infer<typeof RoleGrantSchema>;
export type PermissionChangeDto = z.infer<typeof PermissionChangeSchema>;
export type LoginRecordDto = z.infer<typeof LoginRecordSchema>;
export type OperationLogDto = z.infer<typeof OperationLogSchema>;

export type CreateFilterSchemeInput = z.input<typeof CreateFilterSchemeSchema>;
export type UpdateFilterSchemeInput = z.input<typeof UpdateFilterSchemeSchema>;

/** 列表查询参数 = URL search 协议（与 routes/_auth/admin/users.index.tsx 的 validateSearch 对齐） */
export interface UsersQueryParams {
  page: number;
  pageSize: number;
  keyword?: string;
  filters?: string;
  schemeId?: string;
  sort?: string;
}

/** 详情页日志页签的服务端查询：status 在登录记录里是 result，在操作日志里是 outcome。 */
export type LogQuery = { page: number; pageSize: number; status?: string; from?: string; to?: string };
