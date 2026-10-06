import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TableText } from '@/components/pro/TableText';
import { UpdateJobSchema, jobPreviewQuery, useJobMutations, type JobDetailDto } from '../api';
import { cronPresets, jobError, jobFormValues, jobTime } from '../model';

const ConfigSchema = UpdateJobSchema;
type ConfigValues = z.infer<typeof ConfigSchema>;
export function JobConfigForm({
  initial,
  canUpdate,
  onDirtyChange,
}: {
  initial: JobDetailDto;
  canUpdate: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const [saved, setSaved] = useState(false);
  const mutations = useJobMutations();
  const form = useForm<ConfigValues>({
    resolver: zodResolver(ConfigSchema),
    defaultValues: { ...jobFormValues(initial), key: initial.key, version: initial.version },
    mode: 'onChange',
  });
  const cron = useWatch({ control: form.control, name: 'cron' });
  const [previewCron, setPreviewCron] = useState(cron);
  useEffect(() => {
    const timer = setTimeout(() => setPreviewCron(cron), 300);
    return () => clearTimeout(timer);
  }, [cron]);
  const preview = useQuery({ ...jobPreviewQuery(previewCron), enabled: !!previewCron.trim() });
  const { isDirty: dirty, isValid, errors } = form.formState;
  const pending = mutations.update.isPending;
  useEffect(() => {
    onDirtyChange(dirty || pending);
    return () => onDirtyChange(false);
  }, [dirty, pending, onDirtyChange]);
  useEffect(() => {
    if (!dirty && !pending && initial.version > form.getValues('version')) {
      form.reset({ ...jobFormValues(initial), key: initial.key, version: initial.version });
    }
  }, [dirty, pending, initial, form]);
  const submit = form.handleSubmit(async (values) => {
    if (!dirty || pending) return;
    setSaved(false);
    try {
      const updated = await mutations.update.mutateAsync(values);
      form.reset({ ...jobFormValues(updated), key: updated.key, version: updated.version });
      setSaved(true);
    } catch {
      return;
    }
  });
  const fields = [
    { name: 'maxRetries', label: t('jobs.maxRetries'), min: 0, max: 3 },
    { name: 'retryDelayMinutes', label: t('jobs.retryDelay'), min: 1, max: 60 },
    { name: 'timeoutSeconds', label: t('jobs.timeout'), min: 1, max: 600 },
  ] as const;
  return (
    <>
      <form
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4"
        aria-label={t('jobs.config')}
      >
        <Field>
          <FieldLabel htmlFor="job-cron">{t('jobs.cron')}</FieldLabel>
          <Input
            id="job-cron"
            {...form.register('cron')}
            disabled={!canUpdate || pending}
            aria-invalid={!!errors.cron}
            aria-describedby="job-cron-hint job-cron-error"
            autoComplete="off"
          />
          <FieldDescription id="job-cron-hint">{t('jobs.cronHint')}</FieldDescription>
          <FieldError id="job-cron-error">{errors.cron ? t('jobs.errors.invalid') : null}</FieldError>
        </Field>
        {canUpdate && (
          <div className="flex flex-wrap gap-2">
            {cronPresets.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  form.setValue('cron', preset.cron, { shouldDirty: true, shouldValidate: true });
                  setSaved(false);
                }}
              >
                {t(`jobs.presets.${preset.key}`)}
              </Button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1" aria-label={t('jobs.nextRuns')}>
          <TableText tone="strong">{t('jobs.nextRuns')}</TableText>
          <TableText tone="weak">{t('jobs.timezone')}</TableText>
          {preview.isFetching || previewCron !== cron ? (
            <TableText>{t('jobs.previewLoading')}</TableText>
          ) : preview.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{jobError(preview.error, t)}</AlertDescription>
            </Alert>
          ) : (
            preview.data?.nextRuns.map((date) => (
              <TableText key={date} mono>
                {jobTime(date, i18n.language)}
              </TableText>
            ))
          )}
          <TableText tone="weak" className="whitespace-normal">
            {t('jobs.previewHint')}
          </TableText>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <Field key={field.name}>
              <FieldLabel htmlFor={`job-${field.name}`}>{field.label}</FieldLabel>
              <Input
                id={`job-${field.name}`}
                type="number"
                min={field.min}
                max={field.max}
                {...form.register(field.name, { valueAsNumber: true })}
                disabled={!canUpdate || pending}
                aria-invalid={!!errors[field.name]}
                aria-describedby={`job-${field.name}-error`}
              />
              <FieldError id={`job-${field.name}-error`}>
                {errors[field.name] ? t('jobs.errors.invalid') : null}
              </FieldError>
            </Field>
          ))}
        </div>
        <TableText tone="weak" className="whitespace-normal">
          {t('jobs.timeoutHint')}
        </TableText>
        {mutations.update.error && (
          <Alert variant="destructive">
            <AlertDescription>{jobError(mutations.update.error, t)}</AlertDescription>
          </Alert>
        )}
        {saved && !dirty && (
          <TableText role="status" tone="success">
            {t('jobs.saved')}
          </TableText>
        )}
        {canUpdate && (
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              className="ml-auto"
              variant="primary"
              loading={pending}
              disabled={!dirty || !isValid}
            >
              {t('jobs.save')}
            </Button>
          </div>
        )}
      </form>
    </>
  );
}
