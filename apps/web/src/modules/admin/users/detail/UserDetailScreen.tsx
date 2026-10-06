import { UserDetailNavigation } from './UserDetailNavigation';
import type { UsersSearch } from '../types';
import { UserAccountPolicyDialog } from '../components/UserAccountPolicyDialog';
import type { AccountPolicyInput } from '../api/account-policy';
import { PasswordResetResults } from '../components/PasswordResetResults';
import { UserEmploymentDialog } from '../components/UserEmploymentDialog';
import { UsersRolesDialog } from '../components/UsersRolesDialog';
import { useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { PageFrame, PageSurface, PagePaneBody } from '@/components/pro/page-scaffold';
import { QueryState } from '@/components/pro/QueryState';
import { AnimatedTabs } from '@/components/pro/AnimatedTabs';
import { authzContext } from '@/lib/permission';
import { cn } from '@/lib/utils';
import { useUserMutations, userDetailQuery, type UserDetailDto } from '../api';
import type { ResetPasswordOutcome, UserActionTarget, UserDetailTab } from '../types';
import { LoginTab } from './LoginTab';
import { OperationLogTab } from './OperationLogTab';
import { PermissionTab } from './PermissionTab';
import { ProfileTab } from './ProfileTab';
import { UserDetailActions } from './UserDetailActions';
import { UserDetailHeader } from './UserDetailHeader';

const closedAction: UserActionTarget = { kind: 'closed' };
const detailTabs: UserDetailTab[] = ['profile', 'permission', 'login', 'oplog'];

export function UserDetailScreen({
  userId,
  permissions,
  systemAdmin = false,
  onEdit,
  onBack,
  listContext,
  onNavigate,
}: {
  userId: string;
  permissions: string[];
  systemAdmin?: boolean;
  onEdit: () => void;
  onBack: () => void;
  listContext?: UsersSearch;
  onNavigate?: (id: string, search: UsersSearch) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  const detailResult = useQuery(userDetailQuery(userId));
  const mutations = useUserMutations();
  const authz = authzContext(permissions, systemAdmin);
  const [tab, setTab] = useState<UserDetailTab>('profile');
  const [action, storeAction] = useState<UserActionTarget>(closedAction);
  const [policy, setPolicy] = useState<AccountPolicyInput | null>(null);
  const [resetOutcome, setResetOutcome] = useState<ResetPasswordOutcome | null>(null);

  const setAction = (next: UserActionTarget) => {
    if (next.kind === 'closed') {
      storeAction(next);
      return;
    }
    const available = detailResult.data ? [detailResult.data] : [];
    const targets = next.ids.map((id) => {
      const row = available.find((user) => user.id === id);
      if (!row) throw new Error('user.not_found');
      return { id, version: row.version };
    });
    storeAction(
      next.kind === 'employment'
        ? { ...next, targets, employmentStatus: available.find((user) => user.id === next.ids[0])?.status }
        : { ...next, targets },
    );
  };

  const runAction = async () => {
    if (action.kind === 'closed' || action.kind === 'assignRoles') return;
    if (action.kind === 'delete') {
      await mutations.batchDelete.mutateAsync(action.targets ?? []);
      setAction(closedAction);
      onBack();
      return;
    }
    if (action.kind === 'disable') await mutations.batchDisable.mutateAsync(action.targets ?? []);
    if (action.kind === 'enable') await mutations.batchEnable.mutateAsync(action.targets ?? []);
    if (action.kind === 'resetPassword') {
      const result = await mutations.batchResetPassword.mutateAsync(action.targets ?? []);
      setResetOutcome(result);
      mutations.batchResetPassword.reset();
    }
    setAction(closedAction);
  };

  const actionPending =
    mutations.batchDelete.isPending ||
    mutations.batchDisable.isPending ||
    mutations.batchEnable.isPending ||
    mutations.batchResetPassword.isPending;

  return (
    <PageFrame flush breadcrumbs={[{ label: t('users.title') }, { label: t('users.detail.title') }]}>
      <PageSurface tone="canvas">
        <QueryState
          data={detailResult.data}
          pending={detailResult.isPending}
          error={detailResult.isError}
          loadingLabel={t('users.detail.loading')}
          errorLabel={t('users.detail.loadFailed')}
          retryLabel={t('users.detail.retry')}
          onRetry={() => void detailResult.refetch()}
          className="flex min-h-0 flex-1 flex-col [&>[data-slot=query-state-content]]:contents"
        >
          {(user: UserDetailDto) => (
            <>
              <UserDetailHeader user={user} onBack={onBack} />
              <AnimatedTabs
                variant="content"
                className="shrink-0 px-[calc(24px*var(--app-scale))] pt-[calc(8px*var(--app-scale))]"
                value={tab}
                ariaLabel={t('users.detail.tabsLabel')}
                items={detailTabs.map((value) => ({
                  value,
                  label: t(`users.detail.${value}Tab`),
                }))}
                onValueChange={setTab}
                trailing={
                  <div className="pb-[calc(6px*var(--app-scale))]">
                    <UserDetailActions
                      user={user}
                      authz={authz}
                      navigation={
                        listContext && onNavigate ? (
                          <UserDetailNavigation
                            key={userId}
                            userId={userId}
                            search={listContext}
                            onNavigate={onNavigate}
                          />
                        ) : undefined
                      }
                      onEdit={onEdit}
                      onAccountPolicy={() =>
                        setPolicy({
                          id: user.id,
                          version: user.version,
                          effectiveAt: user.effectiveAt,
                          mustChangePassword: user.mustChangePassword,
                        })
                      }
                      onResetPassword={() =>
                        setAction({ kind: 'resetPassword', ids: [user.id], name: user.name })
                      }
                      onAction={(kind, name) => setAction({ kind, ids: [user.id], name })}
                    />
                  </div>
                }
              />
              <PagePaneBody
                tone="canvas"
                className={cn(
                  'p-2.5',
                  (tab === 'login' || tab === 'oplog') && 'flex flex-col overflow-hidden',
                )}
              >
                {tab === 'profile' && <ProfileTab user={user} />}
                {tab === 'permission' && (
                  <PermissionTab
                    user={user}
                    authz={authz}
                    onAssignRoles={() => setAction({ kind: 'assignRoles', ids: [user.id] })}
                  />
                )}
                {tab === 'login' && <LoginTab key={user.id} userId={user.id} />}
                {tab === 'oplog' && <OperationLogTab key={user.id} userId={user.id} />}
              </PagePaneBody>
            </>
          )}
        </QueryState>

        {policy && (
          <UserAccountPolicyDialog key={policy.id} initial={policy} onClose={() => setPolicy(null)} />
        )}
        <ConfirmDialog
          open={
            action.kind !== 'closed' &&
            action.kind !== 'assignRoles' &&
            action.kind !== 'employment' &&
            action.kind !== 'move'
          }
          severity={action.kind === 'delete' ? 'irreversible' : 'impact'}
          title={action.kind === 'closed' ? '' : t(`users.confirm.${action.kind}.title`)}
          description={
            action.kind === 'closed'
              ? undefined
              : t(`users.confirm.${action.kind}.description`, {
                  count: action.ids.length,
                  name: action.name ?? '',
                })
          }
          cancelText={t('users.actions.cancel')}
          confirmText={action.kind === 'closed' ? '' : t(`users.confirm.${action.kind}.confirm`)}
          confirmation={
            action.kind === 'delete' && action.name
              ? {
                  label: t('users.confirm.delete.typeName'),
                  expected: action.name,
                  placeholder: action.name,
                }
              : undefined
          }
          pending={actionPending}
          error={
            mutations.batchDelete.isError ||
            mutations.batchDisable.isError ||
            mutations.batchEnable.isError ||
            mutations.batchResetPassword.isError
              ? t('users.form.saveFailed')
              : undefined
          }
          onOpenChange={(open) => !open && setAction(closedAction)}
          onConfirm={runAction}
        />

        {action.kind === 'employment' && action.targets?.[0] && (
          <UserEmploymentDialog
            target={action.targets[0]}
            name={action.name}
            status={action.employmentStatus ?? null}
            onClose={() => setAction(closedAction)}
          />
        )}
        {action.kind === 'assignRoles' && (
          <UsersRolesDialog
            targets={action.targets ?? []}
            targetNames={Object.fromEntries(
              action.ids.map((id) => [id, action.name ?? detailResult.data?.name ?? id]),
            )}
            onClose={() => setAction(closedAction)}
          />
        )}
        {resetOutcome && (
          <PasswordResetResults
            outcome={resetOutcome}
            onClose={() => {
              setResetOutcome(null);
              mutations.batchResetPassword.reset();
            }}
          />
        )}
      </PageSurface>
    </PageFrame>
  );
}
