export const roleKeys = {
  all: ['iam', 'roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  detail: (roleId: string) => [...roleKeys.all, 'detail', roleId] as const,
  permissionTree: () => [...roleKeys.all, 'permissionTree'] as const,
};
