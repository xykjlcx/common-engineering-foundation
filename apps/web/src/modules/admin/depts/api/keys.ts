export const deptKeys = {
  references: (id: string) => ['iam', 'depts', 'references', id] as const,
  all: ['iam', 'depts'] as const,
  managementDetail: (id: string) => [...deptKeys.all, 'management-detail', id] as const,
  leaders: (input: { keyword?: string; selectedId?: string }) => [...deptKeys.all, 'leaders', input] as const,
  managementTree: () => [...deptKeys.all, 'management-tree'] as const,
};
