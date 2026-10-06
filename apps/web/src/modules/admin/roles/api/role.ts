import { isDemoBuild } from '@/config/env';
import { demoRole } from '../mocks/demo-role';
import { rpc } from '@/lib/rpc/client';

import { RoleDetailSchema } from '@keel/core/role-contract';
import { queryOptions } from '@tanstack/react-query';
import { permissionTreeFromCatalog } from '../model';
import { roleKeys } from './keys';
import {
  RoleDataPermissionSchema,
  RoleSchema,
  type CreateRoleInput,
  type RoleDataPermission,
  type RolePermissionMap,
} from './schema';

const roleClient = () => (isDemoBuild ? demoRole : rpc.role);

export function normalizeRoleDataPermission(value: RoleDataPermission): RoleDataPermission {
  return RoleDataPermissionSchema.parse({
    defaultScope: value.defaultScope,
    defaultDepartmentIds: value.defaultScope === 'custom' ? value.defaultDepartmentIds : [],
    resources: {},
  });
}

export const rolesQuery = queryOptions({
  queryKey: roleKeys.list(),
  refetchOnMount: false,
  queryFn: async ({ signal }) => {
    const first = await roleClient().list({ page: 1, pageSize: 100 }, { signal });
    const rows = [...first.list];
    for (let page = 2; page <= Math.ceil(first.total / 100); page += 1)
      rows.push(...(await roleClient().list({ page, pageSize: 100 }, { signal })).list);
    return rows.map((row) => RoleSchema.parse(row));
  },
});

export const roleDetailQuery = (roleId: string) =>
  queryOptions({
    queryKey: roleKeys.detail(roleId),
    queryFn: async ({ signal }) =>
      RoleDetailSchema.parse(await roleClient().detail({ id: roleId }, { signal })),
  });

export const permissionTreeQuery = queryOptions({
  queryKey: roleKeys.permissionTree(),
  queryFn: async ({ signal }) => {
    const nodes = await roleClient().grantCatalog({}, { signal });
    return permissionTreeFromCatalog(nodes);
  },
});

export const roleApi = {
  createRole: (dto: CreateRoleInput) => roleClient().create({ name: dto.name, description: dto.desc }),
  updateRole: (id: string, dto: CreateRoleInput, version: number) =>
    roleClient().update({ id, version, name: dto.name, description: dto.desc }),
  deleteRole: (target: { id: string; version: number }) => roleClient().delete(target),
  setRoleEnabled: (target: { id: string; version: number }, enabled: boolean) =>
    roleClient().update({ ...target, enabled }),
  disableRole: (target: { id: string; version: number }) =>
    roleClient().update({ ...target, enabled: false }),
  saveRolePermissions: (id: string, permissions: RolePermissionMap, version: number) =>
    roleClient().assignMenus({ id, version, menuIds: [...new Set(Object.values(permissions).flat())] }),
  saveRoleDataPermissions: (id: string, permission: RoleDataPermission, version: number) =>
    roleClient().update({
      id,
      version,
      dataScope: permission.defaultScope,
      deptIds: permission.defaultScope === 'custom' ? permission.defaultDepartmentIds : [],
    }),
};
