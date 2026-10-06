import { querySchemeKeys } from '@/lib/query-schemes';
import type { LogQuery, UsersQueryParams } from './schema';

export const userKeys = {
  all: ['iam', 'users'] as const,
  list: (params: UsersQueryParams) => [...userKeys.all, 'list', params] as const,
  loginLogs: (id: string, query: LogQuery) => [...userKeys.all, 'loginLogs', id, query] as const,
  operationLogs: (id: string, query: LogQuery) => [...userKeys.all, 'operationLogs', id, query] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  deptCounts: () => [...userKeys.all, 'deptCounts'] as const,
  references: () => [...userKeys.all, 'references'] as const,
  managers: (input: {
    keyword?: string;
    page?: number;
    pageSize?: number;
    selectedId?: string;
    excludeId?: string;
  }) => [...userKeys.all, 'managers', input] as const,
  filterSchemes: () => querySchemeKeys.resource('users'),
};
