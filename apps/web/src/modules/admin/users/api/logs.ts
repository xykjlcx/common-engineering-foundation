import { isDemoBuild } from '@/config/env';
import { queryOptions } from '@tanstack/react-query';
import {
  UserLoginLogPageSchema,
  UserLoginLogQuerySchema,
  UserOperationLogPageSchema,
  UserOperationLogQuerySchema,
} from '@keel/core/user-contract';

import { rpc } from '@/lib/rpc/client';
import { demoUser } from '../mocks/demo-user';
import { userKeys } from './keys';
import type { LogQuery } from './schema';

const range = ({ from, to }: LogQuery) => ({ ...(from ? { from } : {}), ...(to ? { to } : {}) });

export const userLoginLogsQuery = (id: string, query: LogQuery) =>
  queryOptions({
    queryKey: userKeys.loginLogs(id, query),
    queryFn: async ({ signal }) =>
      UserLoginLogPageSchema.parse(
        await (isDemoBuild ? demoUser : rpc.user).loginLogs(
          UserLoginLogQuerySchema.parse({
            id,
            page: query.page,
            pageSize: query.pageSize,
            ...range(query),
            ...(query.status ? { result: query.status } : {}),
          }),
          { signal },
        ),
      ),
  });
export const userOperationLogsQuery = (id: string, query: LogQuery) =>
  queryOptions({
    queryKey: userKeys.operationLogs(id, query),
    queryFn: async ({ signal }) =>
      UserOperationLogPageSchema.parse(
        await (isDemoBuild ? demoUser : rpc.user).operationLogs(
          UserOperationLogQuerySchema.parse({
            id,
            page: query.page,
            pageSize: query.pageSize,
            ...range(query),
            ...(query.status ? { outcome: query.status } : {}),
          }),
          { signal },
        ),
      ),
  });
