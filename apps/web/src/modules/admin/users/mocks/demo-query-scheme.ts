import type { querySchemeApi } from '@/lib/query-schemes';

type Scheme = Awaited<ReturnType<typeof querySchemeApi.list>>['list'][number];
let rows: Scheme[] = [];

export function resetDemoQuerySchemes(seed: readonly Scheme[] = []) {
  rows = seed.map((row) => ({ ...row }));
}

export const demoQueryScheme: typeof querySchemeApi = {
  list: async () => ({ list: rows, total: rows.length, page: 1, pageSize: rows.length }),
  create: async (resource, input) => {
    const now = new Date().toISOString();
    const row: Scheme = {
      id: crypto.randomUUID(),
      resource,
      name: input.name,
      filters: input.filters,
      scope: input.scope ?? 'mine',
      editable: true,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    rows = [...rows, row];
    return row;
  },
  update: async (_resource, input) => {
    const current = rows.find((row) => row.id === input.id);
    if (!current) throw new Error('query_scheme.not_found');
    const row: Scheme = {
      ...current,
      name: input.name ?? current.name,
      filters: input.filters ?? current.filters,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    rows = rows.map((item) => (item.id === input.id ? row : item));
    return row;
  },
  delete: async (_resource, input) => {
    rows = rows.filter((row) => row.id !== input.id);
    return { deleted: true };
  },
};
