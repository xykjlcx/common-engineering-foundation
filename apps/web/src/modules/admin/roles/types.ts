import type {
  CreateRoleInput,
  PermissionTreeGroupDto,
  RoleDataPermission,
  RoleDto,
  RolePermissionMap,
} from '@/modules/admin/roles/api';
import type { DeptDto } from '@/modules/admin/depts/api';

export interface RolesViewProps {
  permissions: string[];
  systemAdmin?: boolean;
  roles: RoleDto[];
  activeRoleId: string;
  permissionTree: PermissionTreeGroupDto[];
  rolePermissions: RolePermissionMap;
  roleDataPermission: RoleDataPermission;
  departments: Pick<DeptDto, 'id' | 'name'>[];
  roleDetailLoading?: boolean;
  roleDetailRefreshing?: boolean;
  memberCount: number | null;
  roleEnabled?: boolean;
  onActiveRoleChange: (id: string) => void;
  onCreateRole: (dto: CreateRoleInput) => void | Promise<void>;
  onUpdateRole?: (id: string, dto: CreateRoleInput) => void | Promise<void>;
  onDisableRole?: (id: string) => void | Promise<void>;
  onDeleteRole: (id: string) => void | Promise<void>;
  onSaveRolePermissions: (id: string, permissions: RolePermissionMap) => void | Promise<void>;
  onSaveRoleDataPermissions: (id: string, permission: RoleDataPermission) => void | Promise<void>;
}

export type DetailTab = 'permissions' | 'dataPermissions' | 'members' | 'changes';
export type TriState = 'none' | 'some' | 'all';
export type PermissionDraftUpdater = RolePermissionMap | ((current: RolePermissionMap) => RolePermissionMap);

export interface PermissionDraftState {
  roleId: string;
  source: RolePermissionMap;
  draft: RolePermissionMap;
}
