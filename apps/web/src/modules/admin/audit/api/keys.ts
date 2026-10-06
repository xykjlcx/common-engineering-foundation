import type { OperationQuery, LoginQuery, SessionQuery } from './schema';

export const auditKeys = {
  all: ['audit'] as const,
  actors: (range: { from: string; to: string }) => [...auditKeys.all, 'actors', range] as const,
  sessions: (params: SessionQuery) => [...auditKeys.all, 'sessions', params] as const,
  sessionLists: () => [...auditKeys.all, 'sessions'] as const,
  entry: () => [...auditKeys.all, 'entry'] as const,
  operationLists: () => [...auditKeys.all, 'operations'] as const,
  operations: (params: OperationQuery) => [...auditKeys.all, 'operations', params] as const,
  operation: (id: string) => [...auditKeys.all, 'operation', id] as const,
  logins: (params: LoginQuery) => [...auditKeys.all, 'logins', params] as const,
};
