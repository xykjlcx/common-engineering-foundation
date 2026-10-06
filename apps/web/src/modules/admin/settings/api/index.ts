import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc/client';
import { settingsKeys } from './keys';
export * from './schema';
export { settingsKeys } from './keys';

export const settingsQuery = queryOptions({
  queryKey: settingsKeys.detail(),
  queryFn: ({ signal }) => rpc.settings.query({}, { signal }),
});
export const publicSettingsQuery = queryOptions({
  queryKey: settingsKeys.public(),
  queryFn: ({ signal }) => rpc.settings.public({}, { signal }),
  staleTime: 60_000,
  retry: false,
});
export const settingsConstraintsQuery = queryOptions({
  queryKey: settingsKeys.constraints(),
  queryFn: ({ signal }) => rpc.settings.constraints({}, { signal }),
  staleTime: 0,
  retry: false,
});

export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof rpc.settings.update>[0]) => rpc.settings.update(input),
    onSuccess: async (data) => {
      client.setQueryData(settingsKeys.detail(), data);
      client.setQueryData(settingsKeys.public(), data.values.general);
      await client.invalidateQueries({ queryKey: settingsKeys.constraints() });
    },
  });
}
