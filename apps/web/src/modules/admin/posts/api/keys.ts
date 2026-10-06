import type { PostsQueryParams } from './schema';

export const postKeys = {
  all: ['iam', 'posts'] as const,
  list: (params: PostsQueryParams) => [...postKeys.all, 'list', params] as const,
  detail: (id: string) => [...postKeys.all, 'detail', id] as const,
  roleOptions: () => [...postKeys.all, 'role-options'] as const,
};
