import { queryPostList } from './slices/query-post-list.js';
import { queryPost } from './slices/query-post.js';
import { queryRoleOptions } from './slices/query-role-options.js';
import { createPost } from './slices/create-post.js';
import { updatePost } from './slices/update-post.js';
import { deletePost } from './slices/delete-post.js';

export const postRouter = {
  list: queryPostList,
  detail: queryPost,
  roleOptions: queryRoleOptions,
  create: createPost,
  update: updatePost,
  delete: deletePost,
};
