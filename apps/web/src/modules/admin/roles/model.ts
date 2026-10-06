import type { CreateRoleInput, PermissionResourceDto, RolePermissionMap } from '@/modules/admin/roles/api';

export const avatarClasses = [
  'bg-(--accent-emphasis)',
  'bg-success',
  'bg-warning',
  'bg-danger',
  'bg-text-3',
  'bg-(--accent-emphasis) text-white',
];

export const emptyRoleDraft: CreateRoleInput = { name: '', desc: '' };

export function clonePermissions(permissions: RolePermissionMap): RolePermissionMap {
  return Object.fromEntries(
    Object.entries(permissions).map(([resourceId, actions]) => [resourceId, [...actions]]),
  );
}

export function cleanPermissions(permissions: RolePermissionMap): RolePermissionMap {
  return Object.fromEntries(
    Object.entries(permissions)
      .map<[string, string[]]>(([resourceId, actions]) => [resourceId, [...new Set(actions)]])
      .filter(([, actions]) => actions.length > 0),
  );
}

export function initials(name: string) {
  return name.slice(-2);
}

export function actionList(resource: PermissionResourceDto) {
  return resource.actions.map((action) => action.id);
}

export const permissionColumns = ['view', 'create', 'update', 'delete', 'export', 'import', 'other'] as const;
export function permissionColumn(code: string): (typeof permissionColumns)[number] {
  const action = code.split(':').at(-1);
  if (action === 'del' || action === 'delete') return 'delete';
  if (
    action === 'view' ||
    action === 'create' ||
    action === 'update' ||
    action === 'export' ||
    action === 'import'
  )
    return action;
  return 'other';
}

export function permissionTreeFromCatalog(
  nodes: import('zod').infer<typeof import('@keel/core/role-contract').GrantMenuSchema>[],
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const groups = new Map<string, import('./api').PermissionTreeGroupDto>();
  const label = (node: (typeof nodes)[number]) =>
    node.label['zh-CN'] ?? node.label['en-US'] ?? node.permCode ?? '';
  const pages = nodes.filter(
    (node) =>
      node.type === 'menu' || (node.type === 'action' && (!node.parentId || !byId.has(node.parentId))),
  );
  for (const page of pages) {
    const ancestors: typeof nodes = [];
    let parent = page.parentId ? byId.get(page.parentId) : undefined;
    while (parent && !ancestors.some((node) => node.id === parent?.id)) {
      ancestors.push(parent);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    const directory = ancestors.find((node) => node.type === 'dir');
    const groupId = directory?.id ?? 'ungrouped';
    const group = groups.get(groupId) ?? {
      id: groupId,
      label: directory ? label(directory) : '',
      resources: [],
    };
    group.resources.push({
      id: page.id,
      label: label(page),
      code: page.permCode ?? '',
      ancestorIds: ancestors.map((node) => node.id),
      actions: [page, ...nodes.filter((node) => node.type === 'action' && node.parentId === page.id)]
        .filter((node) => node.permCode)
        .map((node) => ({
          id: node.id,
          label: node === page && page.type === 'menu' ? '' : label(node),
          code: node.permCode ?? '',
        })),
    });
    groups.set(groupId, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      resources: group.resources.filter((resource) => resource.actions.length > 0),
    }))
    .filter((group) => group.resources.length > 0);
}

export function permissionsFromIds(
  ids: string[],
  tree: import('./api').PermissionTreeGroupDto[],
): RolePermissionMap {
  const selected = new Set(ids);
  const represented = new Set(
    tree.flatMap((group) =>
      group.resources.flatMap((resource) => resource.actions.map((action) => action.id)),
    ),
  );
  return cleanPermissions(
    Object.fromEntries([
      ...ids.filter((id) => !represented.has(id)).map<[string, string[]]>((id) => [id, [id]]),
      ...tree.flatMap((group) =>
        group.resources.map<[string, string[]]>((resource) => [
          resource.id,
          resource.actions.filter((action) => selected.has(action.id)).map((action) => action.id),
        ]),
      ),
    ]),
  );
}

export function permissionsWithAncestors(
  permissions: RolePermissionMap,
  tree: import('./api').PermissionTreeGroupDto[],
): RolePermissionMap {
  const result = clonePermissions(permissions);
  for (const group of tree)
    for (const resource of group.resources) {
      if (permissions[resource.id]?.length) for (const id of resource.ancestorIds ?? []) result[id] = [id];
    }
  return result;
}
