import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { InlineNotice } from '@/components/pro/InlineNotice';
import { PickerPanel } from '@/components/pro/PickerPanel';
import { QueryState } from '@/components/pro/QueryState';
import { SegmentedControl } from '@/components/pro/SegmentedControl';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Dialog } from '@/components/ui/dialog';
import { userRolesQuery, useUserMutations, type RoleBatchMode, type UserTargets } from '../api';

const modes: readonly RoleBatchMode[] = ['add', 'replace', 'remove', 'clear'];

export function UsersRolesDialog({
  targets,
  targetNames,
  onClose,
  onSuccess,
}: {
  targets: UserTargets;
  targetNames?: Readonly<Record<string, string>>;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation('admin');
  const roles = useQuery(userRolesQuery);
  const { batchAssignRoles } = useUserMutations();
  const [mode, setMode] = useState<RoleBatchMode>('add');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const submit = async () => {
    await batchAssignRoles.mutateAsync({ targets, mode, roleIds: mode === 'clear' ? [] : roleIds });
    onSuccess?.();
    onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <FormDialogContent
        size="list"
        title={t('users.confirm.assignRoles.title')}
        description={t('users.confirm.assignRoles.description', { count: targets.length })}
        targets={{
          summary: t('users.bulk.viewTargets', { count: targets.length }),
          items: targets.map((target) => ({ id: target.id, label: targetNames?.[target.id] ?? target.id })),
        }}
        error={batchAssignRoles.isError ? t('users.rolesBatch.failed') : undefined}
        cancelText={t('users.actions.cancel')}
        submitText={t('users.rolesBatch.submit')}
        submitLoading={batchAssignRoles.isPending}
        submitDisabled={!roles.isSuccess || (mode !== 'clear' && roleIds.length === 0)}
        onCancel={onClose}
        onSubmit={submit}
      >
        <QueryState
          data={roles.data}
          pending={roles.isPending}
          error={roles.isError}
          loadingLabel={t('users.loading.list')}
          errorLabel={t('users.loadFailed')}
          retryLabel={t('users.retry')}
          onRetry={() => void roles.refetch()}
        >
          {(items) => (
            <div className="grid gap-4">
              <Field>
                <FieldLabel htmlFor="user-role-mode">{t('users.rolesBatch.mode')}</FieldLabel>
                <SegmentedControl
                  id="user-role-mode"
                  aria-label={t('users.rolesBatch.mode')}
                  value={mode}
                  disabled={batchAssignRoles.isPending}
                  options={modes.map((value) => ({ value, label: t(`users.rolesBatch.short.${value}`) }))}
                  onValueChange={setMode}
                />
              </Field>
              {mode === 'clear' ? (
                <InlineNotice tone="warning">{t('users.rolesBatch.clearNotice')}</InlineNotice>
              ) : (
                <Field>
                  <FieldLabel>{t('users.form.role')}</FieldLabel>
                  <PickerPanel
                    multiple
                    indicator
                    appearance="inline"
                    density="compact"
                    aria-label={t('users.form.role')}
                    nodes={items
                      .filter((role) => role.enabled)
                      .map((role) => ({
                        value: role.id,
                        label: role.name,
                        meta: role.type === 'system' ? t('users.rolesBatch.builtin') : undefined,
                      }))}
                    value={roleIds}
                    onChange={setRoleIds}
                    labels={{
                      searchPlaceholder: t('users.rolesBatch.search'),
                      frequent: t('users.filters.frequent'),
                      empty: t('users.filters.noMatch'),
                      matchHint: (query, count) => t('users.filters.matchHint', { query, count }),
                      hints: [],
                    }}
                  />
                </Field>
              )}
              {mode === 'replace' && roleIds.length > 0 && (
                <InlineNotice tone="warning">{t('users.rolesBatch.replaceNotice')}</InlineNotice>
              )}
            </div>
          )}
        </QueryState>
      </FormDialogContent>
    </Dialog>
  );
}
