import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc/client';
import { messageKeys } from '@/modules/admin/messages/api/keys';
import { noticeKeys } from './keys';
import type { NoticeListParams } from './schema';
export { noticeKeys } from './keys';
export * from './schema';
export const noticesQuery = (params: NoticeListParams) =>
  queryOptions({
    queryKey: noticeKeys.list(params),
    queryFn: ({ signal }) => rpc.notice.list(params, { signal }),
  });
export const noticeDetailQuery = (id: string) =>
  queryOptions({
    queryKey: noticeKeys.detail(id),
    queryFn: ({ signal }) => rpc.notice.detail({ id }, { signal }),
  });
export const noticeAudienceOptionsQuery = queryOptions({
  queryKey: noticeKeys.audienceOptions(),
  queryFn: ({ signal }) => rpc.notice.audienceOptions({}, { signal }),
});
export function useNoticeMutations() {
  const client = useQueryClient();
  const onSuccess = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: noticeKeys.all }),
      client.invalidateQueries({ queryKey: messageKeys.all }),
    ]);
  };
  return {
    create: useMutation({
      mutationFn: (input: Parameters<typeof rpc.notice.create>[0]) => rpc.notice.create(input),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: (input: Parameters<typeof rpc.notice.update>[0]) => rpc.notice.update(input),
      onSuccess,
    }),
    publish: useMutation({
      mutationFn: (input: Parameters<typeof rpc.notice.publish>[0]) => rpc.notice.publish(input),
      onSuccess,
    }),
    withdraw: useMutation({
      mutationFn: (input: Parameters<typeof rpc.notice.withdraw>[0]) => rpc.notice.withdraw(input),
      onSuccess,
    }),
    delete: useMutation({
      mutationFn: (input: Parameters<typeof rpc.notice.delete>[0]) => rpc.notice.delete(input),
      onSuccess,
    }),
    schedule: useMutation({
      mutationFn: (input: Parameters<typeof rpc.notice.schedule>[0]) => rpc.notice.schedule(input),
      onSuccess,
    }),
    cancelSchedule: useMutation({
      mutationFn: (input: Parameters<typeof rpc.notice.cancelSchedule>[0]) =>
        rpc.notice.cancelSchedule(input),
      onSuccess,
    }),
  };
}
