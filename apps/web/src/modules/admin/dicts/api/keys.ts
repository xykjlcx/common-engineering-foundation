import type { DictItemsParams } from './schema';

export const dictKeys = {
  all: ['sys', 'dicts'] as const,
  types: () => [...dictKeys.all, 'types'] as const,
  type: (id: string) => [...dictKeys.all, 'type', id] as const,
  items: (params: DictItemsParams) => [...dictKeys.all, 'items', params] as const,
  item: (id: string) => [...dictKeys.all, 'item', id] as const,
};
