import * as z from 'zod';

// 公开业务契约：仅依赖 zod，可直接供前端表单校验；不依赖数据库、router 或服务端运行时。
const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null)
    .nullable();
export const EmploymentStatusSchema = z.enum(['probation', 'active', 'left']);

/** 账号面：登录身份、联系方式与组织归属——脚手架派生项目一定会保留的一半。 */
export const UserAccountSchema = z.object({
  name: z.string().trim().min(1).max(64),
  email: z.email().max(254).toLowerCase().nullable(),
  phone: z.string().trim().max(32),
  deptId: z.uuid().nullable(),
  managerId: z.uuid().nullable(),
  avatarId: z.uuid().nullable(),
});

/** 人事面：与登录能力无关的人员档案字段——派生项目常整体替换或删除的一半。 */
export const UserHrProfileSchema = z.object({
  employeeNo: optionalText(64),
  postId: z.uuid().nullable(),
  gender: z.enum(['male', 'female', 'other']).nullable(),
  employmentType: optionalText(32),
  employmentStatus: EmploymentStatusSchema.nullable(),
  joinedAt: z.iso.date().nullable(),
  workLocation: optionalText(128),
  remark: optionalText(2000),
});

// 对外形状不变：字段与顺序与拆分前逐字节一致，前端 import 与契约产物都不受影响。
export const UserProfileSchema = UserAccountSchema.extend(UserHrProfileSchema.shape).strict();

export const CreateUserSchema = UserProfileSchema.extend({
  username: z.string().trim().min(2).max(64).toLowerCase(),
  email: UserProfileSchema.shape.email.default(null),
  phone: UserProfileSchema.shape.phone.default(''),
  deptId: UserProfileSchema.shape.deptId.default(null),
  managerId: UserProfileSchema.shape.managerId.default(null),
  avatarId: UserProfileSchema.shape.avatarId.default(null),
  employeeNo: UserProfileSchema.shape.employeeNo.default(null),
  postId: UserProfileSchema.shape.postId.default(null),
  gender: UserProfileSchema.shape.gender.default(null),
  employmentType: UserProfileSchema.shape.employmentType.default(null),
  employmentStatus: UserProfileSchema.shape.employmentStatus.default(null),
  joinedAt: UserProfileSchema.shape.joinedAt.default(null),
  workLocation: UserProfileSchema.shape.workLocation.default(null),
  remark: UserProfileSchema.shape.remark.default(null),
  password: z.string().min(8).max(128),
  roleIds: z.array(z.uuid()).max(50).default([]),
  mustChangePassword: z.boolean().default(true),
  effectiveAt: z.iso.datetime().nullable().default(null),
}).strict();

// 人员离职有账号/会话副作用，通过独立生命周期操作写，普通资料PATCH不能绕开它。
export const UpdateUserSchema = UserProfileSchema.omit({ employmentStatus: true })
  .partial()
  .extend({
    id: z.uuid(),
    version: z.number().int().min(0),
    roleIds: z.array(z.uuid()).max(50).optional(),
  })
  .strict()
  .refine(
    (value) =>
      Object.entries(value).some(([key, field]) => key !== 'id' && key !== 'version' && field !== undefined),
    { error: '至少需要一个待更新字段' },
  );

// 账号策略独立生命周期命令；不可混入普通资料 PATCH。
export const ChangeAccountPolicySchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().min(0),
    effectiveAt: z.iso.datetime().nullable(),
    mustChangePassword: z.boolean(),
  })
  .strict();

export const UserViewSchema = UserProfileSchema.extend({
  postName: z.string().nullable(),
  id: z.uuid(),
  username: z.string(),
  accountStatus: z.enum(['enabled', 'disabled']),
  avatar: z.string().nullable(),
  systemAdmin: z.boolean(),
  roleIds: z.array(z.uuid()),
  mustChangePassword: z.boolean(),
  effectiveAt: z.iso.datetime().nullable(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  lastLoginAt: z.iso.datetime().nullable(),
});
export const UserDetailViewSchema = UserViewSchema.extend({
  effectivePermissions: z.array(z.string()).nullable(),
  scopeSources: z.array(
    z.object({
      roleId: z.uuid(),
      scope: z.enum(['all', 'self', 'dept', 'deptAndChildren', 'custom']),
      deptIds: z.array(z.uuid()),
    }),
  ),
  subsystemKeys: z.array(z.string()),
  managerName: z.string().nullable(),
  createdBy: z.string().nullable(),
  /** 创建人姓名；账号已删除或创建记录缺失时为 null，前端回退显示 createdBy。 */
  createdByName: z.string().nullable(),
  lastLoginIp: z.string().nullable(),
  roleGrants: z.array(
    z.object({
      roleId: z.uuid(),
      grantedBy: z.string().nullable(),
      grantedByName: z.string().nullable(),
      grantedAt: z.iso.datetime(),
    }),
  ),
  /** 有效权限点的可读名称；page=所属页面（分组），label=权限点名称。目录缺失的权限码不出现，前端回退显示权限码。 */
  effectivePermissionLabels: z.array(
    z.object({
      code: z.string(),
      type: z.enum(['dir', 'menu', 'action']),
      label: z.record(z.string(), z.string()),
      page: z.record(z.string(), z.string()).nullable(),
    }),
  ),
  permissionChanges: z.array(
    z.object({
      at: z.iso.datetime(),
      action: z.string(),
      operator: z.string().nullable(),
      operatorName: z.string().nullable(),
      addedRoleIds: z.array(z.uuid()),
      removedRoleIds: z.array(z.uuid()),
    }),
  ),
});
export const UserPageSchema = z.object({
  list: z.array(UserViewSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const UserLogQuerySchema = z
  .object({
    id: z.uuid(),
    page: z.coerce.number<number>().int().min(1).default(1),
    pageSize: z.coerce.number<number>().int().min(1).max(100).default(20),
  })
  .strict();
const UserLogRangeShape = {
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
};
export const UserLoginLogQuerySchema = UserLogQuerySchema.extend({
  ...UserLogRangeShape,
  result: z.enum(['success', 'failure', 'locked']).optional(),
}).strict();
export const UserOperationLogQuerySchema = UserLogQuerySchema.extend({
  ...UserLogRangeShape,
  outcome: z.enum(['success', 'failure', 'denied']).optional(),
}).strict();
export const UserLoginLogSchema = z
  .object({
    id: z.uuid(),
    at: z.iso.datetime(),
    ip: z.string().nullable(),
    device: z.string().nullable(),
    result: z.enum(['success', 'failure', 'locked']),
    reason: z.string().nullable(),
  })
  .strict();
export const UserOperationLogSchema = z
  .object({
    id: z.uuid(),
    at: z.iso.datetime(),
    action: z.string(),
    outcome: z.string(),
    operator: z.string().nullable(),
    operatorName: z.string().nullable(),
  })
  .strict();
export const UserLoginLogPageSchema = z
  .object({
    list: z.array(UserLoginLogSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
  .strict();
export const UserOperationLogPageSchema = UserLoginLogPageSchema.extend({
  list: z.array(UserOperationLogSchema),
});

export const UserManagerOptionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  employeeNo: z.string().nullable(),
});
