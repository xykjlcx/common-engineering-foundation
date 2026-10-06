export {
  changeOwnPassword,
  getAuthUserById,
  verifyCredentials,
  verifyCurrentPassword,
  type AuthUserView,
} from './domain/user-credentials.js';
export {
  canReadAvatar,
  countUsersOfDepartments,
  countUsersOfRoles,
  getDepartmentLeaderOptions,
  getDepartmentLeaderReferences,
  getOwnProfile,
  getRoleIdsOfUser,
  getRoleSubjects,
  updateOwnProfile,
} from './domain/user-access.js';
export type { UserStatus } from './schema.js';
export { USER_PERMS } from './permissions.js';

export { countPostReferences } from './domain/user-access.js';
export { getAuditIdentities } from './domain/user-access.js';
export { findAuditSubjectIds } from './domain/user-access.js';
export { countVisibleUsersWithoutRole } from './scoped.js';
export { getNoticeRecipients } from './domain/notice-recipients.js';
