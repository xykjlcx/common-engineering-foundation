import { createMenu } from './slices/create-menu.js';
import { deleteMenu } from './slices/delete-menu.js';
import { queryMenuTree } from './slices/query-menu-tree.js';
import { queryNavigation } from './slices/query-navigation.js';
import { updateMenu } from './slices/update-menu.js';

export const menuRouter = {
  navigation: queryNavigation,
  create: createMenu,
  update: updateMenu,
  delete: deleteMenu,
  tree: queryMenuTree,
};
