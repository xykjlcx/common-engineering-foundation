import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { QueryState } from '@/components/pro/QueryState';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { TableText } from '@/components/pro/TableText';
import { Switch } from '@/components/ui/switch';

import {
  CreatePostSchema,
  postDetailQuery,
  postRoleOptionsQuery,
  usePostMutations,
  type PostDto,
} from '../api';
import { postError } from '../model';

export function PostDialogForm({
  id,
  onClose,
  onSaved,
}: {
  id?: string;
  onClose: () => void;
  onSaved?: (code: string) => void;
}) {
  const { t } = useTranslation('admin');
  const query = useQuery({ ...postDetailQuery(id ?? ''), enabled: !!id });

  if (id && !query.data)
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogTitle>{t('posts.edit')}</DialogTitle>
          <QueryState
            data={query.data}
            pending={query.isPending}
            error={query.isError}
            loadingLabel={t('posts.loading.list')}
            errorLabel={t('posts.loadFailed')}
            retryLabel={t('posts.retry')}
            onRetry={() => void query.refetch()}
          >
            {() => null}
          </QueryState>
        </DialogContent>
      </Dialog>
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <PostForm key={id ?? 'create'} initial={query.data} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}

function PostForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PostDto;
  onClose: () => void;
  onSaved?: (code: string) => void;
}) {
  const [baseline] = useState(initial);
  const { t } = useTranslation('admin');
  const mutations = usePostMutations();
  const choices = useQuery(postRoleOptionsQuery);

  const form = useForm<z.input<typeof CreatePostSchema>, unknown, z.output<typeof CreatePostSchema>>({
    resolver: zodResolver(CreatePostSchema),
    defaultValues: {
      code: baseline?.code ?? '',
      name: baseline?.name ?? '',
      remark: baseline?.remark ?? '',
      sort: baseline?.sort ?? 0,
      roleIds: baseline?.roleIds ?? [],
      enabled: baseline?.enabled ?? true,
    },
    mode: 'onChange',
  });

  const pending = mutations.create.isPending || mutations.update.isPending;
  const error = mutations.create.error ?? mutations.update.error ?? choices.error;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (baseline) {
        const { code, roleIds, ...patch } = values;
        void code;

        await mutations.update.mutateAsync({
          ...patch,
          ...(form.formState.dirtyFields.roleIds ? { roleIds } : {}),
          id: baseline.id,
          version: baseline.version,
        });
      } else {
        const created = await mutations.create.mutateAsync(values);
        onSaved?.(created.code);
      }

      onClose();
    } catch (cause) {
      form.setError('code', { type: 'server', message: postError(cause, t) });
    }
  });

  return (
    <FormDialogContent
      title={t(baseline ? 'posts.edit' : 'posts.actions.create')}
      cancelText={t('posts.actions.cancel')}
      submitText={t('posts.actions.save')}
      submitLoading={pending}
      submitDisabled={choices.isPending || choices.isError}
      error={error ? postError(error, t) : undefined}
      onCancel={onClose}
      onSubmit={submit}
    >
      <div className="grid gap-3">
        <Field>
          <FieldLabel htmlFor="post-code">{t('posts.columns.code')}</FieldLabel>
          <Input id="post-code" {...form.register('code')} disabled={!!baseline} />
          <FieldError>
            {form.formState.errors.code
              ? form.formState.errors.code?.type === 'server'
                ? form.formState.errors.code?.message
                : t('posts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="post-name">{t('posts.columns.name')}</FieldLabel>
          <Input id="post-name" {...form.register('name')} />
          <FieldError>
            {form.formState.errors.name
              ? form.formState.errors.name?.type === 'server'
                ? form.formState.errors.name?.message
                : t('posts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="post-sort">{t('posts.sort')}</FieldLabel>
          <Input id="post-sort" type="number" {...form.register('sort', { valueAsNumber: true })} />
          <FieldError>{form.formState.errors.sort ? t('posts.invalid') : null}</FieldError>
        </Field>
        <Field>
          <FieldLabel>{t('posts.defaultRoles')}</FieldLabel>
          <Controller
            control={form.control}
            name="roleIds"
            render={({ field }) => (
              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                {choices.data?.map((role) => (
                  <FieldLabel key={role.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={field.value?.includes(role.id) ?? false}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked === true
                            ? [...(field.value ?? []), role.id]
                            : (field.value ?? []).filter((id) => id !== role.id),
                        )
                      }
                    />
                    {role.name}
                  </FieldLabel>
                ))}
                {baseline?.roles
                  .filter((role) => !choices.data?.some((choice) => choice.id === role.id))
                  .map((role) => (
                    <FieldLabel key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value?.includes(role.id) ?? false}
                        disabled={!field.value?.includes(role.id)}
                        onCheckedChange={() =>
                          field.onChange((field.value ?? []).filter((id) => id !== role.id))
                        }
                      />
                      {role.name} — {t('posts.unavailableRole')}
                    </FieldLabel>
                  ))}
                {choices.data?.length === 0 && <TableText>{t('posts.noRoles')}</TableText>}
                {choices.isError && (
                  <Button type="button" onClick={() => void choices.refetch()}>
                    {t('posts.retry')}
                  </Button>
                )}
              </div>
            )}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="post-remark">{t('posts.remark')}</FieldLabel>
          <Input id="post-remark" {...form.register('remark')} />
          <FieldError>
            {form.formState.errors.remark
              ? form.formState.errors.remark?.type === 'server'
                ? form.formState.errors.remark?.message
                : t('posts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="post-enabled">{t('posts.status.enabled')}</FieldLabel>
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <Switch id="post-enabled" checked={field.value ?? false} onCheckedChange={field.onChange} />
            )}
          />
          <FieldError>
            {form.formState.errors.enabled
              ? form.formState.errors.enabled?.type === 'server'
                ? form.formState.errors.enabled?.message
                : t('posts.invalid')
              : null}
          </FieldError>
        </Field>
      </div>
    </FormDialogContent>
  );
}
