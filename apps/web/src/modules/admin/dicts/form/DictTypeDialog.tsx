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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { CreateDictTypeSchema, dictTypeQuery, useDictMutations, type DictType } from '../api';
import { dictError } from '../model';

export function DictTypeDialog({
  id,
  onClose,
  onSaved,
}: {
  id?: string;
  onClose: () => void;
  onSaved?: (code: string) => void;
}) {
  const { t } = useTranslation('admin');
  const query = useQuery({ ...dictTypeQuery(id ?? ''), enabled: !!id });

  if (id && !query.data)
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogTitle>{t('dicts.editType')}</DialogTitle>
          <QueryState
            data={query.data}
            pending={query.isPending}
            error={query.isError}
            loadingLabel={t('dicts.loading')}
            errorLabel={t('dicts.errors.failed')}
            retryLabel={t('dicts.retry')}
            onRetry={() => void query.refetch()}
          >
            {() => null}
          </QueryState>
        </DialogContent>
      </Dialog>
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DictTypeForm key={id ?? 'create'} initial={query.data} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}

function DictTypeForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: DictType;
  onClose: () => void;
  onSaved?: (code: string) => void;
}) {
  const [baseline] = useState(initial);
  const { t } = useTranslation('admin');
  const mutations = useDictMutations();

  const form = useForm<z.input<typeof CreateDictTypeSchema>, unknown, z.output<typeof CreateDictTypeSchema>>({
    resolver: zodResolver(CreateDictTypeSchema),
    defaultValues: {
      code: baseline?.code ?? '',
      name: baseline?.name ?? '',
      remark: baseline?.remark ?? '',
      enabled: baseline?.enabled ?? true,
    },
    mode: 'onChange',
  });

  const pending = mutations.createType.isPending || mutations.updateType.isPending;
  const error = mutations.createType.error ?? mutations.updateType.error;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (baseline) {
        const { code, ...patch } = values;
        void code;
        await mutations.updateType.mutateAsync({ ...patch, id: baseline.id, version: baseline.version });
      } else {
        const created = await mutations.createType.mutateAsync(values);
        onSaved?.(created.code);
      }

      onClose();
    } catch (cause) {
      form.setError('code', { type: 'server', message: dictError(cause, t) });
    }
  });

  return (
    <FormDialogContent
      title={t(baseline ? 'dicts.editType' : 'dicts.createType')}
      cancelText={t('dicts.cancel')}
      submitText={t('dicts.save')}
      submitLoading={pending}
      error={error ? dictError(error, t) : undefined}
      onCancel={onClose}
      onSubmit={submit}
    >
      <div className="grid gap-3">
        <Field>
          <FieldLabel htmlFor="dict-type-code">{t('dicts.code')}</FieldLabel>
          <Input id="dict-type-code" {...form.register('code')} disabled={!!baseline} />
          <FieldError>
            {form.formState.errors.code
              ? form.formState.errors.code?.type === 'server'
                ? form.formState.errors.code?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dict-type-name">{t('dicts.name')}</FieldLabel>
          <Input id="dict-type-name" {...form.register('name')} />
          <FieldError>
            {form.formState.errors.name
              ? form.formState.errors.name?.type === 'server'
                ? form.formState.errors.name?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dict-type-remark">{t('dicts.remark')}</FieldLabel>
          <Input id="dict-type-remark" {...form.register('remark')} />
          <FieldError>
            {form.formState.errors.remark
              ? form.formState.errors.remark?.type === 'server'
                ? form.formState.errors.remark?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dict-type-enabled">{t('dicts.enabled')}</FieldLabel>
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <Switch
                id="dict-type-enabled"
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <FieldError>
            {form.formState.errors.enabled
              ? form.formState.errors.enabled?.type === 'server'
                ? form.formState.errors.enabled?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
      </div>
    </FormDialogContent>
  );
}
