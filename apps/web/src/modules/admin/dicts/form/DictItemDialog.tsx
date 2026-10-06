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
import { SelectControl } from '@/components/ui/select';
import { CreateDictItemSchema, dictItemQuery, useDictMutations, type DictItem, DICT_TONES } from '../api';
import { dictError } from '../model';

export function DictItemDialog({
  id,
  onClose,
  typeId,
}: {
  id?: string;
  onClose: () => void;
  typeId: string;
}) {
  const { t } = useTranslation('admin');
  const query = useQuery({ ...dictItemQuery(id ?? ''), enabled: !!id });

  if (id && !query.data)
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogTitle>{t('dicts.editItem')}</DialogTitle>
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
      <DictItemForm key={id ?? `create:${typeId}`} initial={query.data} onClose={onClose} typeId={typeId} />
    </Dialog>
  );
}

function DictItemForm({
  initial,
  onClose,
  typeId,
}: {
  initial?: DictItem;
  onClose: () => void;
  typeId: string;
}) {
  const [baseline] = useState(initial);
  const { t } = useTranslation('admin');
  const mutations = useDictMutations();

  const form = useForm<z.input<typeof CreateDictItemSchema>, unknown, z.output<typeof CreateDictItemSchema>>({
    resolver: zodResolver(CreateDictItemSchema),
    defaultValues: {
      typeId: baseline?.typeId ?? typeId,
      value: baseline?.value ?? '',
      label: baseline?.label ?? '',
      tone: baseline?.tone ?? 'neutral',
      sort: baseline?.sort ?? 0,
      remark: baseline?.remark ?? '',
      enabled: baseline?.enabled ?? true,
      isDefault: baseline?.isDefault ?? false,
    },
    mode: 'onChange',
  });

  const pending = mutations.createItem.isPending || mutations.updateItem.isPending;
  const error = mutations.createItem.error ?? mutations.updateItem.error;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (baseline) {
        const { typeId, value, ...patch } = values;
        void typeId;
        void value;
        await mutations.updateItem.mutateAsync({ ...patch, id: baseline.id, version: baseline.version });
      } else await mutations.createItem.mutateAsync(values);

      onClose();
    } catch (cause) {
      form.setError('value', { type: 'server', message: dictError(cause, t) });
    }
  });

  return (
    <FormDialogContent
      title={t(baseline ? 'dicts.editItem' : 'dicts.createItem')}
      cancelText={t('dicts.cancel')}
      submitText={t('dicts.save')}
      submitLoading={pending}
      error={error ? dictError(error, t) : undefined}
      onCancel={onClose}
      onSubmit={submit}
    >
      <div className="grid gap-3">
        <Field>
          <FieldLabel htmlFor="dict-item-value">{t('dicts.value')}</FieldLabel>
          <Input id="dict-item-value" {...form.register('value')} disabled={!!baseline} />
          <FieldError>
            {form.formState.errors.value
              ? form.formState.errors.value?.type === 'server'
                ? form.formState.errors.value?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dict-item-label">{t('dicts.label')}</FieldLabel>
          <Input id="dict-item-label" {...form.register('label')} />
          <FieldError>
            {form.formState.errors.label
              ? form.formState.errors.label?.type === 'server'
                ? form.formState.errors.label?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dict-item-tone">{t('dicts.tone')}</FieldLabel>
          <Controller
            control={form.control}
            name="tone"
            render={({ field }) => (
              <SelectControl
                id="dict-item-tone"
                value={field.value ?? 'neutral'}
                onValueChange={field.onChange}
                options={DICT_TONES.map((value) => ({ value, label: t(`dicts.tones.${value}`) }))}
              />
            )}
          />
          <FieldError>
            {form.formState.errors.tone
              ? form.formState.errors.tone?.type === 'server'
                ? form.formState.errors.tone?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dict-item-sort">{t('dicts.sort')}</FieldLabel>
          <Input id="dict-item-sort" type="number" {...form.register('sort', { valueAsNumber: true })} />
          <FieldError>
            {form.formState.errors.sort
              ? form.formState.errors.sort?.type === 'server'
                ? form.formState.errors.sort?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dict-item-remark">{t('dicts.remark')}</FieldLabel>
          <Input id="dict-item-remark" {...form.register('remark')} disabled={baseline?.builtin} />
          <FieldError>
            {form.formState.errors.remark
              ? form.formState.errors.remark?.type === 'server'
                ? form.formState.errors.remark?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dict-item-isDefault">{t('dicts.default')}</FieldLabel>
          <Controller
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <Switch
                id="dict-item-isDefault"
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                disabled={baseline?.builtin}
              />
            )}
          />
          <FieldError>
            {form.formState.errors.isDefault
              ? form.formState.errors.isDefault?.type === 'server'
                ? form.formState.errors.isDefault?.message
                : t('dicts.invalid')
              : null}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="dict-item-enabled">{t('dicts.enabled')}</FieldLabel>
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <Switch
                id="dict-item-enabled"
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
