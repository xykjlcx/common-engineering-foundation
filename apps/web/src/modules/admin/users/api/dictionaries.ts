import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { isDemoBuild } from '@/config/env';
import { demoDepartments, demoRoles, demoUser } from '../mocks/demo-user';
import { rpc } from '@/lib/rpc/client';
import { userKeys } from './keys';

// 与旧 REST 字典隔离缓存；选择值直接使用后端 UUID，不把演示标识提交到真实命令。
const referencesQuery = queryOptions({
  queryKey: userKeys.references(),
  staleTime: 5 * 60_000,
  queryFn: async ({ signal }) =>
    isDemoBuild
      ? {
          departments: demoDepartments().map((dept) => ({ ...dept, enabled: true })),
          roles: demoRoles(),
          posts: [],
        }
      : rpc.user.lookups({}, { signal }),
});
export const userDeptTreeQuery = queryOptions({ ...referencesQuery, select: (data) => data.departments });
export const userRolesQuery = queryOptions({ ...referencesQuery, select: (data) => data.roles });
export const userManagerOptionsQuery = (input: Omit<Parameters<typeof rpc.user.managerOptions>[0], 'page'>) =>
  infiniteQueryOptions({
    queryKey: userKeys.managers(input),
    initialPageParam: 1,
    queryFn: async ({ signal, pageParam }) => {
      if (isDemoBuild) {
        const page = await demoUser.list({ keyword: input.keyword, page: pageParam, pageSize: 30 });
        return {
          list: page.list.map(({ id, name, employeeNo }) => ({ id, name, employeeNo })),
          total: page.total,
          selected: null,
        };
      }
      return rpc.user.managerOptions({ ...input, page: pageParam, pageSize: 30 }, { signal });
    },
    getNextPageParam: (last, all) =>
      all.reduce((count, page) => count + page.list.length, 0) < last.total ? all.length + 1 : undefined,
  });
export { userDeptPathLabel, type UserDeptPathNode } from '../model';

export const userPostsQuery = queryOptions({ ...referencesQuery, select: (data) => data.posts });
export const userDeptCountsQuery = queryOptions({
  queryKey: userKeys.deptCounts(),
  staleTime: 30_000,
  queryFn: async ({ signal }) =>
    isDemoBuild ? demoUser.deptCounts({}) : rpc.user.deptCounts({}, { signal }),
});
