import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { QueryState } from '@/components/pro/QueryState';
import { useLastSuccessfulData } from '@/components/pro/use-last-successful-data';
import {
  menuApi,
  menuKeys,
  managedMenusQuery,
  subsystemsQuery,
  type CreateMenuInput,
  type UpdateMenuInput,
} from '../api';
import { MenusView } from './MenusView';
import type { Subsystem } from '@/modules/types';

export interface MenusPageProps {
  permissions: string[];
  systemAdmin?: boolean;
}
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function MenusScene({ permissions, systemAdmin = false }: MenusPageProps) {
  const { t } = useTranslation('admin');
  const subsystems = useQuery(subsystemsQuery);
  const [activeSubsystemKey, setActiveSubsystemKey] = useState('');

  return (
    <QueryState
      data={subsystems.data}
      pending={subsystems.isPending}
      error={subsystems.isError}
      loadingLabel={t('menus.loading')}
      errorLabel={t('menus.loadFailed')}
      retryLabel={t('menus.retry')}
      onRetry={() => void subsystems.refetch()}
    >
      {(rows) => (
        <MenusSession
          permissions={permissions}
          systemAdmin={systemAdmin}
          subsystems={rows}
          activeSubsystemKey={
            rows.some((subsystem) => subsystem.key === activeSubsystemKey)
              ? activeSubsystemKey
              : (rows[0]?.key ?? 'admin')
          }
          onActiveSubsystemChange={setActiveSubsystemKey}
        />
      )}
    </QueryState>
  );
}

function MenusSession({
  permissions,
  systemAdmin,
  subsystems,
  activeSubsystemKey,
  onActiveSubsystemChange,
}: MenusPageProps & {
  subsystems: Subsystem[];
  activeSubsystemKey: string;
  onActiveSubsystemChange: (key: string) => void;
}) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const router = useRouter({ warn: false });
  const menus = useQuery(managedMenusQuery(activeSubsystemKey));
  // 换子系统后新 key 请求失败时留住上一份成功数据，QueryState 走「旧树 + 顶部通条」而不是整页错误屏。
  const lastMenus = useLastSuccessfulData(menus.data);

  const invalidateMenus = async () => {
    await queryClient.invalidateQueries({ queryKey: menuKeys.menuLists() });
    await queryClient.invalidateQueries({ queryKey: menuKeys.navigation(), refetchType: 'none' });
    await router?.invalidate({ sync: true, filter: (match) => match.routeId.startsWith('/_auth') });
  };
  const mutationError = (error: unknown) => toast.error(errorMessage(error, t('menus.toast.failed')));

  const createMenu = useMutation({
    mutationFn: menuApi.createMenu,
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.created'));
    },
    onError: mutationError,
    meta: { silent: true },
  });
  const updateMenu = useMutation({
    mutationFn: ({ id, dto, version }: { id: string; dto: UpdateMenuInput; version: number }) =>
      menuApi.updateMenu(id, dto, version),
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.updated'));
    },
    onError: mutationError,
    meta: { silent: true },
  });
  const deleteMenu = useMutation({
    mutationFn: menuApi.deleteMenu,
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.deleted'));
    },
    onError: mutationError,
    meta: { silent: true },
  });
  const setMenuVisibility = useMutation({
    mutationFn: ({ id, visible, version }: { id: string; visible: boolean; version: number }) =>
      menuApi.setMenuVisibility(id, { visible }, version),
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.visibilityUpdated'));
    },
    onError: mutationError,
    meta: { silent: true },
  });
  return (
    <QueryState
      data={lastMenus}
      pending={menus.isPending}
      refreshing={menus.isFetching && !menus.isPending}
      error={menus.isError}
      loadingLabel={t('menus.loading')}
      errorLabel={t('menus.loadFailed')}
      retryLabel={t('menus.retry')}
      onRetry={() => void menus.refetch()}
    >
      {(rows) => (
        <MenusView
          catalogManaged
          permissions={permissions}
          systemAdmin={systemAdmin}
          subsystems={subsystems}
          activeSubsystemKey={activeSubsystemKey}
          menus={rows}
          refreshing={menus.isFetching}
          onActiveSubsystemChange={onActiveSubsystemChange}
          onCreateMenu={async (dto: CreateMenuInput) => {
            await createMenu.mutateAsync(dto);
          }}
          onUpdateMenu={async (id: string, dto: UpdateMenuInput, version: number) => {
            await updateMenu.mutateAsync({ id, dto, version });
          }}
          onDeleteMenu={async (id: string, version: number) => {
            await deleteMenu.mutateAsync({ id, version });
          }}
          onSetMenuVisibility={async (id: string, visible: boolean, version: number) => {
            await setMenuVisibility.mutateAsync({ id, visible, version });
          }}
        />
      )}
    </QueryState>
  );
}
