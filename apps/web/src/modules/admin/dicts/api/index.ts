import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc/client';
import { dictKeys } from './keys';
import type { DictItemsParams } from './schema';

export * from './schema';
export { dictKeys } from './keys';

export const dictTypesQuery = queryOptions({
  queryKey: dictKeys.types(),
  queryFn: ({ signal }) => rpc.dict.types({}, { signal }),
});

export const dictTypeQuery = (id: string) =>
  queryOptions({ queryKey: dictKeys.type(id), queryFn: ({ signal }) => rpc.dict.type({ id }, { signal }) });

export const dictItemsQuery = (params: DictItemsParams) =>
  queryOptions({
    queryKey: dictKeys.items(params),
    queryFn: ({ signal }) => rpc.dict.items(params, { signal }),
  });

export const dictItemQuery = (id: string) =>
  queryOptions({ queryKey: dictKeys.item(id), queryFn: ({ signal }) => rpc.dict.item({ id }, { signal }) });

export function useDictMutations() {
  const client = useQueryClient();
  const onSuccess = () => client.invalidateQueries({ queryKey: dictKeys.all });

  return {
    createType: useMutation({
      mutationFn: (input: Parameters<typeof rpc.dict.createType>[0]) => rpc.dict.createType(input),
      onSuccess,
    }),
    updateType: useMutation({
      mutationFn: (input: Parameters<typeof rpc.dict.updateType>[0]) => rpc.dict.updateType(input),
      onSuccess,
    }),
    deleteType: useMutation({
      mutationFn: (input: Parameters<typeof rpc.dict.deleteType>[0]) => rpc.dict.deleteType(input),
      onSuccess,
    }),
    createItem: useMutation({
      mutationFn: (input: Parameters<typeof rpc.dict.createItem>[0]) => rpc.dict.createItem(input),
      onSuccess,
    }),
    updateItem: useMutation({
      mutationFn: (input: Parameters<typeof rpc.dict.updateItem>[0]) => rpc.dict.updateItem(input),
      onSuccess,
    }),
    deleteItem: useMutation({
      mutationFn: (input: Parameters<typeof rpc.dict.deleteItem>[0]) => rpc.dict.deleteItem(input),
      onSuccess,
    }),
  };
}
