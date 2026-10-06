import { isDemoBuild } from '@/config/env';
import { querySchemeApi } from '@/lib/query-schemes';

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { demoQueryScheme } from '../mocks/demo-query-scheme';
import { FilterSchemesSchema, type CreateFilterSchemeInput, type UpdateFilterSchemeInput } from './schema';
import { userKeys } from './keys';

const client = () => (isDemoBuild ? demoQueryScheme : querySchemeApi);

export const filterSchemesQuery = queryOptions({
  queryKey: userKeys.filterSchemes(),
  staleTime: 5 * 60 * 1000,
  queryFn: async ({ signal }) => FilterSchemesSchema.parse((await client().list('users', signal)).list),
});

export const filterSchemeApi = {
  createScheme: (dto: CreateFilterSchemeInput) => client().create('users', dto),
  updateScheme: (id: string, dto: UpdateFilterSchemeInput & { version: number }) =>
    client().update('users', { ...dto, id }),
  deleteScheme: async ({ id, version }: { id: string; version: number }): Promise<void> => {
    await client().delete('users', { id, version });
  },
};

export function useFilterSchemeMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: userKeys.filterSchemes() });
  const createScheme = useMutation({ mutationFn: filterSchemeApi.createScheme, onSuccess: invalidate });
  const updateScheme = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFilterSchemeInput & { version: number } }) =>
      filterSchemeApi.updateScheme(id, dto),
    onSuccess: invalidate,
  });
  const deleteScheme = useMutation({ mutationFn: filterSchemeApi.deleteScheme, onSuccess: invalidate });
  return { createScheme, updateScheme, deleteScheme };
}
