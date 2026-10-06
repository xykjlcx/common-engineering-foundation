import { queryOptions } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc/client';
import { auditKeys } from './keys';
import {
  OperationQuerySchema,
  LoginQuerySchema,
  type OperationQuery,
  type LoginQuery,
  type SessionQuery,
} from './schema';

export * from './schema';
export { auditKeys } from './keys';

export const auditEntryQuery = queryOptions({
  queryKey: auditKeys.entry(),
  queryFn: ({ signal }) => rpc.audit.entry({}, { signal }),
});

export const operationsQuery = (params: OperationQuery) =>
  queryOptions({
    queryKey: auditKeys.operations(params),
    queryFn: ({ signal }) => rpc.audit.operations(params, { signal }),
    enabled: OperationQuerySchema.safeParse(params).success,
  });

export const operationQuery = (id: string) =>
  queryOptions({
    queryKey: auditKeys.operation(id),
    queryFn: ({ signal }) => rpc.audit.operation({ id }, { signal }),
  });

export const loginsQuery = (params: LoginQuery) =>
  queryOptions({
    queryKey: auditKeys.logins(params),
    queryFn: ({ signal }) => rpc.audit.logins(params, { signal }),
    enabled: LoginQuerySchema.safeParse(params).success,
  });

export const actorsQuery = (range: { from: string; to: string }) =>
  queryOptions({
    queryKey: auditKeys.actors(range),
    queryFn: ({ signal }) => rpc.audit.actors(range, { signal }),
    enabled: OperationQuerySchema.safeParse({ ...range }).success,
  });

export const sessionsQuery = (params: SessionQuery) =>
  queryOptions({
    queryKey: auditKeys.sessions(params),
    queryFn: ({ signal }) => rpc.audit.sessions(params, { signal }),
  });

export const revokeSession = (handle: string) => rpc.audit.revokeSession({ handle });
