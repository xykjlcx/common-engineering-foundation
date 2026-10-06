import settings from './settings.json';
import notices from './notices.json';
import messages from './messages.json';
import audit from './audit.json';
import jobs from './jobs.json';
import posts from './posts.json';
import dicts from './dicts.json';
// admin 命名空间的资源聚合：按业务纵切一文件一业务。
// 加/删业务 = 加/删对应 json + 本文件一行（zh 与 en 各一行，形状由 TS 对齐）。

import dashboard from './dashboard.json';
import depts from './depts.json';
import menus from './menus.json';
import navigation from './navigation.json';
import profile from './profile.json';
import roles from './roles.json';
import users from './users.json';

const admin = {
  settings,
  messages,
  notices,
  jobs,
  audit,
  dicts,
  posts,
  dashboard,
  depts,
  menus,
  navigation,
  profile,
  roles,
  users,
};

export type AdminResources = typeof admin;

export default admin;
