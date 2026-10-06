import { assignUserRoles } from './slices/assign-user-roles.js';
import { batchArchiveUsers } from './slices/batch-archive-users.js';
import { batchMoveUsers } from './slices/batch-move-users.js';
import { previewMoveUsers } from './slices/preview-move-users.js';
import { batchResetPassword } from './slices/batch-reset-password.js';
import { batchUserRoles } from './slices/batch-user-roles.js';
import { batchUserStatus } from './slices/batch-user-status.js';
import { changeAccountPolicy } from './slices/change-account-policy.js';
import { changeUserEmployment } from './slices/change-user-employment.js';
import { changeUserStatus } from './slices/change-user-status.js';
import { createUser } from './slices/create-user.js';
import { exportUsers } from './slices/export-users.js';
import { getUserDetail } from './slices/get-user-detail.js';
import { importUsers } from './slices/import-users.js';
import { previewImport } from './slices/preview-user-import.js';
import { queryUserDeptCounts } from './slices/query-user-dept-counts.js';
import { queryUserList } from './slices/query-user-list.js';
import { queryUserLoginLogs } from './slices/query-user-login-logs.js';
import { queryUserLookups } from './slices/query-user-lookups.js';
import { queryUserManagerOptions } from './slices/query-user-manager-options.js';
import { queryUserOperationLogs } from './slices/query-user-operation-logs.js';
import { resetUserPassword } from './slices/reset-user-password.js';
import { updateUser } from './slices/update-user.js';

export const userRouter = {
  loginLogs: queryUserLoginLogs,
  operationLogs: queryUserOperationLogs,
  deptCounts: queryUserDeptCounts,
  lookups: queryUserLookups,
  managerOptions: queryUserManagerOptions,
  previewImport,
  importUsers,
  exportUsers,
  batchResetPassword,
  batchMove: batchMoveUsers,
  previewMove: previewMoveUsers,
  changeEmployment: changeUserEmployment,
  batchArchive: batchArchiveUsers,
  batchStatus: batchUserStatus,
  batchRoles: batchUserRoles,
  create: createUser,
  update: updateUser,
  detail: getUserDetail,
  list: queryUserList,
  changeStatus: changeUserStatus,
  changeAccountPolicy,
  resetPassword: resetUserPassword,
  assignRoles: assignUserRoles,
};
