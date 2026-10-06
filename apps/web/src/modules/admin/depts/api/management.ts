import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { isDemoBuild } from '@/config/env';
import { rpc } from '@/lib/rpc/client';

import { demoDept } from '../mocks/demo-dept';
import { deptKeys } from './keys';
const client = () => (isDemoBuild ? demoDept : rpc.dept);
// 部门目录是准静态数据（CLAUDE.md 缓存分档）：长 staleTime + 写后按 deptKeys.all 前缀失效。
// users 侧的部门树走 user.lookups（perm='none'，只需任一用户业务权限），不能并到本 query：
// dept.tree 要 iam:dept:view，合并会让只有 iam:user:view 的账号在成员页丢掉部门树。
export const departmentTreeQuery = queryOptions({
  queryKey: deptKeys.managementTree(),
  staleTime: 5 * 60_000,
  queryFn: ({ signal }) => client().tree({}, { signal }),
});
export const departmentApi = {
  preview: (input: Parameters<typeof rpc.dept.preview>[0]) => client().preview(input),
  create: (input: Parameters<typeof rpc.dept.create>[0]) => client().create(input),
  update: (input: Parameters<typeof rpc.dept.update>[0]) => client().update(input),
  delete: (input: Parameters<typeof rpc.dept.delete>[0]) => client().delete(input),
};

export const departmentDetailQuery = (id: string) =>
  queryOptions({
    queryKey: deptKeys.managementDetail(id),
    staleTime: 0,
    queryFn: ({ signal }) => client().detail({ id }, { signal }),
  });
export const departmentLeaderOptionsQuery = (
  input: Omit<Parameters<typeof rpc.dept.leaderOptions>[0], 'page'>,
) =>
  infiniteQueryOptions({
    queryKey: deptKeys.leaders(input),
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) =>
      client().leaderOptions({ ...input, page: pageParam, pageSize: 30 }, { signal }),
    getNextPageParam: (last, all) =>
      all.reduce((total, page) => total + page.list.length, 0) < last.total ? all.length + 1 : undefined,
  });

export const departmentReferencesQuery = (id: string) =>
  queryOptions({
    queryKey: deptKeys.references(id),
    queryFn: ({ signal }) => client().references({ id }, { signal }),
    staleTime: 0,
  });
