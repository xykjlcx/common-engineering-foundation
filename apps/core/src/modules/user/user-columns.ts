import { appUsers } from './schema.js';

// 投影按 contract 的同一条缝分组（账号面 / 人事面 / 账号状态），合并顺序即对外列顺序，不得重排。

/** 账号面：登录身份、联系方式与组织归属。 */
const accountColumns = {
  id: appUsers.id,
  username: appUsers.username,
  name: appUsers.name,
  email: appUsers.email,
  phone: appUsers.phone,
  deptId: appUsers.deptId,
  managerId: appUsers.managerId,
  avatarId: appUsers.avatarId,
};

/** 人事面：与登录能力无关的人员档案字段。 */
const hrProfileColumns = {
  employeeNo: appUsers.employeeNo,
  postId: appUsers.postId,
  gender: appUsers.gender,
  employmentType: appUsers.employmentType,
  employmentStatus: appUsers.employmentStatus,
  joinedAt: appUsers.joinedAt,
  workLocation: appUsers.workLocation,
  remark: appUsers.remark,
};

/** 账号策略与行元数据；凭据列永不进入公开投影。 */
const accountStateColumns = {
  mustChangePassword: appUsers.mustChangePassword,
  effectiveAt: appUsers.effectiveAt,
  status: appUsers.status,
  isSystemAdmin: appUsers.isSystemAdmin,
  version: appUsers.version,
  createdAt: appUsers.createdAt,
  updatedAt: appUsers.updatedAt,
};

/** 公开投影排除凭据；认证原始读取独立提供。 */
export const userColumns = { ...accountColumns, ...hrProfileColumns, ...accountStateColumns };
