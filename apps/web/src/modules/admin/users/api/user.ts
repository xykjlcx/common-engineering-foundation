import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { meQuery } from '@/modules/admin/auth/api';
import { menuKeys } from '@/modules/admin/menus/api';
import { deptKeys } from '@/modules/admin/depts/api/keys';

import { isDemoBuild } from '@/config/env';
import { hasLegacyPositionFilter, parseSort } from '../model';
import { demoUser, type UserRpcClient } from '../mocks/demo-user';
import { rpc } from '@/lib/rpc/client';
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserDetailSchema,
  UsersPageSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UsersQueryParams,
} from './schema';
import { userKeys } from './keys';

const userClient = (): UserRpcClient => (isDemoBuild ? demoUser : rpc.user);

export type UserTargets = Parameters<typeof rpc.user.batchStatus>[0]['targets'];
export type RoleBatchMode = Parameters<typeof rpc.user.batchRoles>[0]['mode'];
function usersListQueryParams(params: UsersQueryParams) {
  const parsed = parseSort(params.sort);
  if (params.sort && !parsed) throw new Error('user.invalid_sort');
  const sort: Parameters<typeof rpc.user.list>[0]['sort'] = parsed
    ? `${parsed.field}:${parsed.dir}`
    : undefined;
  return {
    page: params.page,
    pageSize: params.pageSize,
    keyword: params.keyword,
    ...(params.filters ? { filters: params.filters } : {}),
    ...(sort ? { sort } : {}),
  };
}
export const usersQuery = (params: UsersQueryParams) =>
  queryOptions({
    queryKey: userKeys.list(usersListQueryParams(params)),
    enabled: !hasLegacyPositionFilter(params.filters),
    queryFn: async ({ signal }) => {
      if (hasLegacyPositionFilter(params.filters)) throw new Error('user.legacy_position_filter');
      return UsersPageSchema.parse(await userClient().list(usersListQueryParams(params), { signal }));
    },
    placeholderData: keepPreviousData,
    refetchOnMount: false,
  });
export const userDetailQuery = (id: string) =>
  queryOptions({
    queryKey: userKeys.detail(id),
    queryFn: async ({ signal }) => UserDetailSchema.parse(await userClient().detail({ id }, { signal })),
  });
export const userApi = {
  createUser: (dto: CreateUserInput) => userClient().create(CreateUserSchema.parse(dto)),
  updateUser: (id: string, dto: UpdateUserInput) =>
    userClient().update(UpdateUserSchema.parse({ ...dto, id })),
  batchDisableUsers: (targets: UserTargets) => userClient().batchStatus({ targets, status: 'disabled' }),
  batchEnableUsers: (targets: UserTargets) => userClient().batchStatus({ targets, status: 'active' }),
  batchAssignRoles: (targets: UserTargets, roleIds: string[], mode: RoleBatchMode = 'replace') =>
    userClient().batchRoles({ targets, roleIds, mode }),
  assignRoles: (input: Parameters<typeof rpc.user.assignRoles>[0]) => userClient().assignRoles(input),
  changeStatus: (input: Parameters<typeof rpc.user.changeStatus>[0]) => userClient().changeStatus(input),
  resetPassword: (input: Parameters<typeof rpc.user.resetPassword>[0]) => userClient().resetPassword(input),
  // 待后端入口就绪；绝不落回旧 REST mock 假成功。
  deleteUser: (target: UserTargets[number]) => userClient().batchArchive({ targets: [target] }),
  changeEmployment: (input: Parameters<typeof rpc.user.changeEmployment>[0]) =>
    userClient().changeEmployment(input),
  previewMove: (input: Parameters<typeof rpc.user.previewMove>[0]) => userClient().previewMove(input),
  batchMoveUsers: (targets: UserTargets, deptId: string | null, impactFingerprint?: string) =>
    userClient().batchMove({ targets, deptId, ...(impactFingerprint ? { impactFingerprint } : {}) }),
  batchResetPassword: (targets: UserTargets) => userClient().batchResetPassword({ targets }),
  batchDeleteUsers: (targets: UserTargets) => userClient().batchArchive({ targets }),
  uploadAvatar: (file: File) => rpc.file.stageAvatar({ file }),
  export: (params: Parameters<typeof rpc.user.exportUsers>[0]) => rpc.user.exportUsers(params),
  previewImport: (input: Parameters<typeof rpc.user.previewImport>[0]) => rpc.user.previewImport(input),
  importUsers: (input: Parameters<typeof rpc.user.importUsers>[0]) => rpc.user.importUsers(input),
};

export function useUserMutations() {
  const qc = useQueryClient();
  const router = useRouter({ warn: false });
  const invalidateData = () => qc.invalidateQueries({ queryKey: userKeys.all });
  const invalidateMembership = async () => {
    await Promise.all([invalidateData(), qc.invalidateQueries({ queryKey: deptKeys.all })]);
  };
  const invalidateAuthorization = async () => {
    await Promise.all([
      invalidateMembership(),
      qc.invalidateQueries({ queryKey: meQuery.queryKey, refetchType: 'none' }),
      qc.invalidateQueries({ queryKey: menuKeys.navigation(), refetchType: 'none' }),
    ]);
    if (router)
      await router.invalidate({ sync: true, filter: (match) => match.routeId.startsWith('/_auth') });
  };
  const createUser = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: invalidateMembership,
    gcTime: 0,
  });
  const updateUser = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserInput }) => userApi.updateUser(id, dto),
    onSuccess: async (_result, { id, dto }) => {
      await invalidateData();
      if (dto.deptId !== undefined) await qc.invalidateQueries({ queryKey: deptKeys.all });
      if (id === qc.getQueryData(meQuery.queryKey)?.userId)
        await qc.invalidateQueries({ queryKey: meQuery.queryKey });
    },
  });
  const changeEmployment = useMutation({ mutationFn: userApi.changeEmployment, onSuccess: invalidateData });
  const deleteUser = useMutation({ mutationFn: userApi.deleteUser, onSuccess: invalidateAuthorization });
  const batchDisable = useMutation({
    mutationFn: userApi.batchDisableUsers,
    onSuccess: invalidateAuthorization,
  });
  const batchEnable = useMutation({
    mutationFn: userApi.batchEnableUsers,
    onSuccess: invalidateAuthorization,
  });
  const batchMove = useMutation({
    mutationFn: ({
      targets,
      deptId,
      impactFingerprint,
    }: {
      targets: UserTargets;
      deptId: string | null;
      impactFingerprint?: string;
    }) => userApi.batchMoveUsers(targets, deptId, impactFingerprint),
    onSuccess: invalidateAuthorization,
  });
  const batchAssignRoles = useMutation({
    mutationFn: ({
      targets,
      roleIds,
      mode,
    }: {
      targets: UserTargets;
      roleIds: string[];
      mode?: RoleBatchMode;
    }) => userApi.batchAssignRoles(targets, roleIds, mode),
    onSuccess: invalidateAuthorization,
  });
  const batchResetPassword = useMutation({
    mutationFn: userApi.batchResetPassword,
    onSuccess: invalidateData,
    gcTime: 0,
  });
  const batchDelete = useMutation({
    mutationFn: userApi.batchDeleteUsers,
    onSuccess: invalidateAuthorization,
  });

  return {
    createUser,
    changeEmployment,
    updateUser,
    deleteUser,
    batchDisable,
    batchEnable,
    batchMove,
    batchAssignRoles,
    batchResetPassword,
    batchDelete,
  };
}
