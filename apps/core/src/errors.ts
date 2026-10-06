import { settingsErrors } from './modules/settings/errors.js';
import { noticeErrors } from './modules/notice/errors.js';
import { messageErrors } from './modules/message/errors.js';
import { jobErrors } from './modules/job/errors.js';
import { auditErrors } from './modules/audit/errors.js';
import { postErrors } from './modules/post/errors.js';
import { dictErrors } from './modules/dict/errors.js';
import { composeErrors, kernelErrors } from './kernel/errors.js';
import { authErrors } from './modules/auth/errors.js';
import { deptErrors } from './modules/dept/errors.js';
import { fileErrors } from './modules/file/errors.js';
import { menuErrors } from './modules/menu/errors.js';
import { querySchemeErrors } from './modules/query-scheme/errors.js';
import { roleErrors } from './modules/role/errors.js';
import { userErrors } from './modules/user/errors.js';

export const errorStatuses = composeErrors([
  settingsErrors,
  noticeErrors,
  messageErrors,
  jobErrors,
  auditErrors,
  dictErrors,
  postErrors,
  kernelErrors,
  authErrors,
  userErrors,
  deptErrors,
  roleErrors,
  menuErrors,
  fileErrors,
  querySchemeErrors,
]);
