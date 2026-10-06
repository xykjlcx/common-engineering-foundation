import type { UsersQueryParams, UserTargets, UserDto } from './api';

/** URL search 协议 = 查询参数 + 必填关键词。与 routes/_auth/admin/users.index.tsx 的 validateSearch 对齐 */
export type UsersSearch = UsersQueryParams & { keyword: string };

export type UserDetailTab = 'profile' | 'permission' | 'login' | 'oplog';

export type UserActionTarget =
  | { kind: 'closed' }
  | { kind: 'move'; ids: string[]; targets?: UserTargets; name?: string }
  | {
      kind: 'employment';
      ids: string[];
      targets?: UserTargets;
      name?: string;
      employmentStatus?: UserDto['status'];
    }
  | { kind: 'delete'; ids: string[]; targets?: UserTargets; name?: string }
  | { kind: 'disable'; ids: string[]; targets?: UserTargets; name?: string }
  | { kind: 'enable'; ids: string[]; targets?: UserTargets; name?: string }
  | { kind: 'resetPassword'; ids: string[]; targets?: UserTargets; name?: string }
  | { kind: 'assignRoles'; ids: string[]; targets?: UserTargets; name?: string };

export type ResetPasswordOutcome = Awaited<ReturnType<typeof import('./api').userApi.batchResetPassword>>;

/** 表单页两种模式；编辑态由路由带 userId 进来，表单内自拉详情 */
export type UserFormMode = 'create' | 'edit';
