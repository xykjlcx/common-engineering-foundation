import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { userKeys } from '@/modules/admin/users/api/keys';
import { rpc } from '@/lib/rpc/client';
import { postKeys } from './keys';
import type { PostsQueryParams } from './schema';

export * from './schema';
export { postKeys } from './keys';

export const postsQuery = (params: PostsQueryParams) =>
  queryOptions({
    queryKey: postKeys.list(params),
    queryFn: ({ signal }) =>
      rpc.post.list(
        { keyword: params.keyword, filters: params.filters, page: params.page, pageSize: params.pageSize },
        { signal },
      ),
  });

export const postDetailQuery = (id: string) =>
  queryOptions({
    queryKey: postKeys.detail(id),
    queryFn: ({ signal }) => rpc.post.detail({ id }, { signal }),
  });

export const postRoleOptionsQuery = queryOptions({
  queryKey: postKeys.roleOptions(),
  queryFn: ({ signal }) => rpc.post.roleOptions({}, { signal }),
});

export function usePostMutations() {
  const client = useQueryClient();

  const onSuccess = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: postKeys.all }),
      client.invalidateQueries({ queryKey: userKeys.all }),
    ]);
  };

  return {
    create: useMutation({
      mutationFn: (input: Parameters<typeof rpc.post.create>[0]) => rpc.post.create(input),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: (input: Parameters<typeof rpc.post.update>[0]) => rpc.post.update(input),
      onSuccess,
    }),
    delete: useMutation({
      mutationFn: (input: Parameters<typeof rpc.post.delete>[0]) => rpc.post.delete(input),
      onSuccess,
    }),
  };
}
