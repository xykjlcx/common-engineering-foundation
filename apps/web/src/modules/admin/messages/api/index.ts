import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { noticeKeys } from '@/modules/admin/notices/api/keys';
import { rpc } from '@/lib/rpc/client';
import { messageKeys } from './keys';
import type { MessageListParams } from './schema';
export { messageKeys } from './keys';
export * from './schema';
export const messagesQuery = (params: MessageListParams) =>
  queryOptions({
    queryKey: messageKeys.list(params),
    queryFn: ({ signal }) => rpc.message.list(params, { signal }),
  });
export const messageDetailQuery = (id: string) =>
  queryOptions({
    queryKey: messageKeys.detail(id),
    queryFn: ({ signal }) => rpc.message.detail({ id }, { signal }),
  });
export const unreadQuery = queryOptions({
  queryKey: messageKeys.unread(),
  queryFn: ({ signal }) => rpc.message.unread({}, { signal }),
});
export const pendingNoticesQuery = queryOptions({
  queryKey: messageKeys.pending(),
  queryFn: ({ signal }) => rpc.message.pending({}, { signal }),
});
export const messagePreferencesQuery = queryOptions({
  queryKey: messageKeys.preferences(),
  queryFn: ({ signal }) => rpc.message.preferences({}, { signal }),
});
export function useMessageMutations() {
  const client = useQueryClient();
  const onSuccess = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: messageKeys.all }),
      client.invalidateQueries({ queryKey: noticeKeys.all }),
    ]);
  };
  return {
    read: useMutation({
      mutationFn: (input: Parameters<typeof rpc.message.read>[0]) => rpc.message.read(input),
      onSuccess,
    }),
    archive: useMutation({
      mutationFn: (input: Parameters<typeof rpc.message.archive>[0]) => rpc.message.archive(input),
      onSuccess,
    }),
    confirm: useMutation({
      mutationFn: (input: Parameters<typeof rpc.message.confirm>[0]) => rpc.message.confirm(input),
      onSuccess,
    }),
    readAll: useMutation({ mutationFn: () => rpc.message.readAll({}), onSuccess }),
    savePreferences: useMutation({
      mutationFn: (input: Parameters<typeof rpc.message.savePreferences>[0]) =>
        rpc.message.savePreferences(input),
      onSuccess,
    }),
  };
}
