import settings from './settings.json';
import notices from './notices.json';
import messages from './messages.json';
import audit from './audit.json';
import jobs from './jobs.json';
import posts from './posts.json';
import dicts from './dicts.json';
// 形状以 zh-CN 为准：漏一个业务 json 这里编译期就红（不必等 locale-key-parity 跑）。

import dashboard from './dashboard.json';
import depts from './depts.json';
import menus from './menus.json';
import navigation from './navigation.json';
import profile from './profile.json';
import roles from './roles.json';
import users from './users.json';

import type { AdminResources } from '../../zh-CN/admin';

const admin: Record<keyof AdminResources, unknown> = {
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

export default admin;
