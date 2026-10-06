import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc/client';
import { jobKeys } from './keys';
import type { JobListParams, JobLogParams } from './schema';
export * from './schema';
export { jobKeys } from './keys';
export const jobsQuery = (params: JobListParams) =>
  queryOptions({ queryKey: jobKeys.list(params), queryFn: ({ signal }) => rpc.job.list(params, { signal }) });
export const jobDetailQuery = (key: string) =>
  queryOptions({
    queryKey: jobKeys.detail(key),
    queryFn: ({ signal }) => rpc.job.detail({ key }, { signal }),
  });
export const jobPreviewQuery = (cron: string) =>
  queryOptions({
    queryKey: jobKeys.preview(cron),
    queryFn: ({ signal }) => rpc.job.preview({ cron }, { signal }),
    retry: false,
  });
export const jobLogsQuery = (params: JobLogParams) =>
  queryOptions({ queryKey: jobKeys.logs(params), queryFn: ({ signal }) => rpc.job.logs(params, { signal }) });
export function useJobMutations() {
  const client = useQueryClient();
  const onSuccess = () => client.invalidateQueries({ queryKey: jobKeys.all });
  return {
    update: useMutation({
      mutationFn: (input: Parameters<typeof rpc.job.update>[0]) => rpc.job.update(input),
      onSuccess,
    }),
    setEnabled: useMutation({
      mutationFn: (input: Parameters<typeof rpc.job.setEnabled>[0]) => rpc.job.setEnabled(input),
      onSuccess,
    }),
    run: useMutation({
      mutationFn: (input: Parameters<typeof rpc.job.run>[0]) => rpc.job.run(input),
      onSuccess,
    }),
  };
}
