import { assignRoleMenus } from './slices/assign-role-menus.js';
import { createRole } from './slices/create-role.js';
import { deleteRole } from './slices/delete-role.js';
import { queryRoleDetail } from './slices/query-role-detail.js';
import { queryRoleGrantCatalog } from './slices/query-role-grant-catalog.js';
import { queryRoleList } from './slices/query-role-list.js';
import { updateRole } from './slices/update-role.js';

export const roleRouter = {
  grantCatalog: queryRoleGrantCatalog,
  detail: queryRoleDetail,
  create: createRole,
  update: updateRole,
  delete: deleteRole,
  list: queryRoleList,
  assignMenus: assignRoleMenus,
};
