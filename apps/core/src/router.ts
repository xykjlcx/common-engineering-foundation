import { settingsRouter } from './modules/settings/router.js';
import { noticeRouter } from './modules/notice/router.js';
import { messageRouter } from './modules/message/router.js';
import { jobRouter } from './modules/job/router.js';
import { dashboardRouter } from './modules/dashboard/router.js';
import { auditRouter } from './modules/audit/router.js';
import { postRouter } from './modules/post/router.js';
import { dictRouter } from './modules/dict/router.js';
import type { RouterClient } from '@orpc/server';
import { authRouter } from './modules/auth/router.js';
import { deptRouter } from './modules/dept/router.js';
import { fileRouter } from './modules/file/router.js';
import { menuRouter } from './modules/menu/router.js';
import { profileRouter } from './modules/profile/router.js';
import { registerSchemeResources } from './modules/query-scheme/api.js';
import { querySchemeRouter } from './modules/query-scheme/router.js';
import { roleRouter } from './modules/role/router.js';
import { systemRouter } from './modules/system/router.js';
import { userRouter } from './modules/user/router.js';
import { schemeResources } from './query-scheme-resources.js';

// 装配时登记查询方案资源：模块只提供机制，业务筛选契约由装配层注入。
registerSchemeResources(schemeResources);

export const router = {
  settings: settingsRouter,
  notice: noticeRouter,
  message: messageRouter,
  job: jobRouter,
  dashboard: dashboardRouter,
  audit: auditRouter,
  dict: dictRouter,
  post: postRouter,
  queryScheme: querySchemeRouter,
  system: systemRouter,
  file: fileRouter,
  auth: authRouter,
  profile: profileRouter,
  user: userRouter,
  dept: deptRouter,
  role: roleRouter,
  menu: menuRouter,
};

export type AppRouter = typeof router;
/** 前端仅导入类型，服务端运行时代码不进入浏览器。 */
export type AppRouterClient = RouterClient<AppRouter>;
