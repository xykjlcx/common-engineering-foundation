import { isDemoBuild } from '@/config';
import { settingsConstraintsQuery, passwordMeetsPolicy } from '@/modules/admin/settings/api';
import { authzContext, matchPermission } from '@/lib/permission';
import { buildUserUpdate, userFormChanges } from './model';
import { generateUserPassword } from '../model';
import { FieldError, FieldRequiredHint } from '@/components/ui/field';
import { useEffect, useRef, useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFrame, PageSurface, PagePaneFooter } from '@/components/pro/page-scaffold';
import { InterruptBanner } from '@/components/pro/InterruptBanner';
import { TableText } from '@/components/pro/TableText';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { QueryState } from '@/components/pro/QueryState';
import { BizError, HttpError } from '@/lib/http/errors';
import { Button } from '@/components/ui/button';
import { useUserMutations, userDetailQuery, type UserFormInput } from '../api';
import type { UserFormMode } from '../types';
import { UserBreadcrumb } from '../components/UserBreadcrumb';
import { UserFormAside } from './UserFormAside';
import { UserFormFields } from './UserFormFields';
import { emptyUserForm, useUserForm } from './useUserForm';

interface UserFormPageProps {
  mode: UserFormMode;
  permissions?: string[];
  systemAdmin?: boolean;
  userId?: string;
  onDone: (userId?: string) => void;
  onCancel: () => void;
}

export function UserFormPage(props: UserFormPageProps): JSX.Element {
  return <UserFormSession key={`${props.mode}:${props.userId ?? ''}`} {...props} />;
}

function UserFormSession({
  mode,
  userId,
  onDone,
  onCancel,
  permissions = [],
  systemAdmin = false,
}: UserFormPageProps): JSX.Element {
  const { t } = useTranslation('admin');
  const canAssignRoles = matchPermission(authzContext(permissions, systemAdmin), 'iam:user:assign_roles');
  const [formEpoch, resetFormFields] = useState(0);
  const detailResult = useQuery({ ...userDetailQuery(userId ?? ''), enabled: mode === 'edit' && !!userId });
  const form = useUserForm(detailResult.data);
  const constraints = useQuery({ ...settingsConstraintsQuery, enabled: !isDemoBuild && mode === 'create' });
  useEffect(() => {
    const policy = constraints.data?.credentials;
    if (mode === 'create' && policy && !passwordMeetsPolicy(form.getValues('password'), policy)) {
      form.setValue('password', generateUserPassword(policy));
    }
  }, [constraints.data, form, mode]);
  const mutations = useUserMutations();
  const submissionLock = useRef(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [conflict, setConflict] = useState(false);
  const values = form.watch();
  const initialPassword = values.password;
  const baseline = form.getBaseline();
  const changeCount = mode === 'edit' && baseline ? userFormChanges(baseline, values).length : 0;

  const title = mode === 'create' ? t('users.form.createTitle') : t('users.form.editTitle');
  const pending = avatarUploading || mutations.createUser.isPending || mutations.updateUser.isPending;
  const missing =
    mode === 'edit' &&
    (!userId ||
      ((detailResult.error instanceof BizError || detailResult.error instanceof HttpError) &&
        detailResult.error.status === 404));
  const reload = async () => {
    const result = await detailResult.refetch();
    if (!result.isSuccess || !result.data) return;
    form.reloadFrom(result.data);
    setConflict(false);
    setReloadOpen(false);
  };

  const submit = (andCreateAnother: boolean) =>
    form.handleSubmit(async (values: UserFormInput) => {
      if (submissionLock.current || avatarUploading) return;
      submissionLock.current = true;
      form.clearErrors('root');
      setConflict(false);
      try {
        if (mode === 'edit') {
          if (!userId || !detailResult.data || missing) return;
          const baseline = form.getBaseline();
          if (!baseline) return;
          const patch = buildUserUpdate(baseline, values);
          if (!patch) return;
          await mutations.updateUser.mutateAsync({ id: baseline.id, dto: patch });
          toast.success(t('users.form.saved'));
          onDone(userId);
          return;
        }
        const created = await mutations.createUser.mutateAsync(values);
        toast.success(t('users.form.saved'));
        if (andCreateAnother) {
          form.reset(emptyUserForm());
          resetFormFields((epoch) => epoch + 1);
          return;
        }
        onDone(created.id);
      } catch (error) {
        if (error instanceof BizError && error.code === 'user.version_conflict') setConflict(true);
        form.setError('root', {
          message: t(
            error instanceof BizError && error.code === 'user.version_conflict'
              ? 'users.form.versionConflict'
              : 'users.form.saveFailed',
          ),
        });
      } finally {
        if (mode === 'create') mutations.createUser.reset();
        submissionLock.current = false;
      }
    });

  const formElement = (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(false)(event);
      }}
    >
      {conflict && (
        <div className="px-[calc(24px*var(--app-scale))] pt-[calc(12px*var(--app-scale))]">
          <InterruptBanner
            tone="warning"
            message={t('users.form.conflict')}
            action={{ label: t('users.form.conflictAction'), onClick: () => setReloadOpen(true) }}
          />
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <UserFormFields
            key={formEpoch}
            mode={mode}
            canAssignRoles={canAssignRoles}
            onAvatarUploadingChange={(uploading) => setAvatarUploading(uploading)}
            control={form.control}
            initialPassword={initialPassword}
            accountEnabled={mode === 'create' || detailResult.data?.enabled}
            onRegeneratePassword={() =>
              form.setValue('password', generateUserPassword(constraints.data?.credentials), {
                shouldDirty: true,
              })
            }
          />
        </div>
        {(mode === 'create' || baseline) && <UserFormAside mode={mode} baseline={baseline} values={values} />}
      </div>

      <FieldError role="alert">{conflict ? null : form.formState.errors.root?.message}</FieldError>
      <PagePaneFooter variant="form" hint={t('users.form.footerHint')}>
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          {t('users.actions.cancel')}
        </Button>
        {mode === 'create' && (
          <Button type="button" variant="secondary" loading={pending} onClick={() => void submit(true)()}>
            {t('users.form.saveAndNew')}
          </Button>
        )}
        <Button type="submit" variant="primary" loading={pending}>
          {t(mode === 'create' ? 'users.form.submitCreate' : 'users.form.submitEdit')}
        </Button>
      </PagePaneFooter>
    </form>
  );

  return (
    <PageFrame flush breadcrumbs={[{ label: t('users.title') }, { label: title }]} className="min-h-0">
      <PageSurface>
        <UserBreadcrumb
          items={[t('users.title')]}
          current={
            mode === 'edit' && baseline ? (
              <>
                {title}
                <TableText
                  tone="weak"
                  mono
                  className="ml-[calc(10px*var(--app-scale))] inline-block align-middle"
                >
                  {baseline.account}
                </TableText>
              </>
            ) : (
              title
            )
          }
          trailing={
            changeCount > 0 ? (
              <span role="status">{t('users.form.dirtyCount', { count: changeCount })}</span>
            ) : (
              <FieldRequiredHint
                before={t('users.form.requiredHintBefore')}
                after={t('users.form.requiredHintAfter')}
              />
            )
          }
        />

        {mode === 'create' ? (
          formElement
        ) : (
          <QueryState
            data={missing ? undefined : detailResult.data}
            pending={detailResult.isPending}
            refreshing={detailResult.isFetching && !detailResult.isPending}
            error={missing || detailResult.isError}
            loadingLabel={t('users.detail.loading')}
            errorLabel={missing ? t('users.form.notFound') : t('users.detail.loadFailed')}
            retryLabel={!userId ? t('users.actions.cancel') : t('users.detail.retry')}
            onRetry={() => (!userId ? onCancel() : void detailResult.refetch())}
            className="flex min-h-0 flex-1 flex-col [&>[data-slot=query-state-content]]:flex [&>[data-slot=query-state-content]]:min-h-0 [&>[data-slot=query-state-content]]:flex-1 [&>[data-slot=query-state-content]]:flex-col"
          >
            {() => formElement}
          </QueryState>
        )}
        {mode === 'edit' && userId && (missing || !detailResult.data) && (
          <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
            {t('users.actions.cancel')}
          </Button>
        )}
        <ConfirmDialog
          open={reloadOpen}
          title={t('users.form.reloadTitle')}
          description={t('users.form.reloadDescription')}
          cancelText={t('users.actions.cancel')}
          confirmText={t('users.form.reload')}
          severity="reversible"
          error={detailResult.isError ? t('users.detail.loadFailed') : undefined}
          onOpenChange={(open) => setReloadOpen(open)}
          onConfirm={reload}
        />
      </PageSurface>
    </PageFrame>
  );
}
