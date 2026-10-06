import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DeptsPage } from '@/modules/admin/depts';
import { departmentTreeQuery as deptTreeQuery } from '@/modules/admin/depts/api';

// 选中部门与搜索条件存 URL，可刷新与分享。
const searchSchema = z.object({
  deptId: z.string().optional(),
  view: z.enum(['chart', 'create', 'edit', 'members', 'add-members', 'changes']).catch('chart'),
  kind: z.enum(['company', 'department']).catch('department'),
  parentId: z.string().optional(),
  companyId: z.string().catch(''),
  typeFilter: z.enum(['all', 'company', 'department']).catch('all'),
  memberPage: z.coerce.number().int().min(1).catch(1),
  memberKeyword: z.string().catch(''),
  includeChildren: z.boolean().catch(false),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(20),
  keyword: z.string().catch(''),
  roleId: z.string().optional(),
});

export const Route = createFileRoute('/_auth/admin/depts')({
  validateSearch: searchSchema,
  // 部门树是准静态数据，首屏预热一次即可；成员表由场景组件自行请求（数据下沉）。
  // 预取而非 ensureQueryData：请求失败不该把整页顶成路由错误屏，交给 DeptsScene 的 QueryState 处理。
  loader: ({ context }) => context.queryClient.prefetchQuery(deptTreeQuery),
  staticData: {
    labelKey: 'depts.title',
    permission: 'iam:dept:view',
    groupKey: 'depts.title',
    actions: [
      { key: 'dept-create', code: 'iam:dept:create', labelKey: 'depts.actions.create', superuserOnly: true },
      { key: 'dept-update', code: 'iam:dept:update', labelKey: 'depts.actions.edit', superuserOnly: true },
      { key: 'dept-del', code: 'iam:dept:del', labelKey: 'depts.actions.delete', superuserOnly: true },
    ],
  },
  component: DeptsRoute,
});

function DeptsRoute() {
  const { me } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const actions = Route.useMatch({ select: (match) => match.staticData.actions ?? [] });
  return (
    <DeptsPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      actions={actions}
      deptId={search.deptId}
      keyword={search.keyword}
      view={search.view}
      kind={search.kind}
      parentId={search.parentId}
      companyId={search.companyId}
      typeFilter={search.typeFilter}
      memberPage={search.memberPage}
      memberKeyword={search.memberKeyword}
      includeChildren={search.includeChildren}
      onViewChange={(view, patch) => {
        void navigate({
          search: { ...search, ...patch, view, memberPage: 1, memberKeyword: '', includeChildren: false },
        });
      }}
      onFilterChange={(patch) => {
        void navigate({
          search: {
            ...search,
            ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
          },
          replace: true,
        });
      }}
      onKeywordChange={(keyword) => {
        void navigate({ search: { ...search, keyword }, replace: true });
      }}
      onSelect={(deptId) => {
        void navigate({ search: { ...search, deptId } });
      }}
    />
  );
}
