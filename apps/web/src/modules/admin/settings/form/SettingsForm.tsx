import { Fragment, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBlocker } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { SideList } from '@/components/pro/SideList';
import { TableText } from '@/components/pro/TableText';
import { ListPageHeader } from '@/components/pro/ListChrome';
import { PagePane, PagePaneFooter, PageSection, PageDivider } from '@/components/pro/page-scaffold';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SettingsValuesSchema, useUpdateSettings, type SettingsValues, type SettingsDto } from '../api';
import { changedSettingsCount, settingsError, settingsSections, type SettingsSection } from '../model';

const numericPaths = {
  lockThreshold: 'security.lockThreshold',
  ipLockThreshold: 'security.ipLockThreshold',
  lockWindowMs: 'security.lockWindowMs',
  sessionTtlMs: 'security.sessionTtlMs',
  sessionRememberTtlMs: 'security.sessionRememberTtlMs',
  minLength: 'credentials.minLength',
  avatarMaxMiB: 'uploads.avatarMaxMiB',
} as const;

export function SettingsForm({ initial, canUpdate }: { initial: SettingsDto; canUpdate: boolean }) {
  const { t } = useTranslation('admin');
  const [section, setSection] = useState<SettingsSection>('general');
  const [baseline, setBaseline] = useState(initial);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const mutation = useUpdateSettings();
  const form = useForm<SettingsValues>({
    resolver: zodResolver(SettingsValuesSchema),
    defaultValues: initial.values,
    mode: 'onChange',
  });
  useWatch({ control: form.control });
  const dirty = form.formState.isDirty;
  const pending = mutation.isPending;
  const changes = changedSettingsCount(form.getValues(), baseline.values);
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => (dirty || pending) && current.pathname !== next.pathname,
    enableBeforeUnload: dirty || pending,
    withResolver: true,
  });
  const submit = form.handleSubmit(
    async (input) => {
      if (!dirty || pending || !canUpdate) return;
      setSaved(false);
      try {
        const updated = await mutation.mutateAsync({ version: baseline.version, values: input });
        setBaseline(updated);
        form.reset(updated.values);
        setSaved(true);
      } catch {
        /* 保留草稿及其基线版本。 */
      }
    },
    (errors) => {
      const invalid = settingsSections.find((key) => errors[key]);
      if (invalid) setSection(invalid);
    },
  );
  const discard = () => {
    form.reset(initial.values);
    setBaseline(initial);
    mutation.reset();
    setSaved(false);
    setDiscardOpen(false);
  };
  function row(key: string, control: ReactNode, invalid = false) {
    return (
      <Field key={key} className="grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 px-5 py-3.5">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`settings-${key}`}>{t(`settings.fields.${key}.label`)}</FieldLabel>
          <FieldDescription id={`settings-${key}-hint`}>{t(`settings.fields.${key}.hint`)}</FieldDescription>
          <FieldError id={`settings-${key}-error`}>
            {invalid ? t('settings.errors.invalid') : null}
          </FieldError>
        </div>
        {control}
      </Field>
    );
  }
  function textField(name: 'appName' | 'loginDescription', maxLength: number) {
    return row(
      name,
      <Input
        id={`settings-${name}`}
        className="w-[calc(320px*var(--app-scale))] max-w-full"
        {...form.register(`general.${name}`)}
        maxLength={maxLength}
        disabled={!canUpdate || pending}
        aria-invalid={!!form.formState.errors.general?.[name]}
        aria-describedby={`settings-${name}-hint settings-${name}-error`}
      />,
      !!form.formState.errors.general?.[name],
    );
  }
  function numberField(
    name:
      | 'lockThreshold'
      | 'ipLockThreshold'
      | 'lockWindowMs'
      | 'sessionTtlMs'
      | 'sessionRememberTtlMs'
      | 'minLength'
      | 'avatarMaxMiB',
    min: number,
    max: number,
    factor = 1,
    unit = 'times',
  ) {
    const path = numericPaths[name];
    const invalid = !!form.getFieldState(path, form.formState).error;
    return row(
      name,
      <Controller
        name={path}
        control={form.control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Input
              id={`settings-${name}`}
              className="w-24"
              type="number"
              min={min}
              max={max}
              step={factor === 1 ? 1 : 'any'}
              value={Number.isFinite(field.value) ? field.value / factor : ''}
              ref={field.ref}
              onBlur={field.onBlur}
              onChange={(event) =>
                field.onChange(
                  event.target.value === '' ? Number.NaN : Math.round(Number(event.target.value) * factor),
                )
              }
              disabled={!canUpdate || pending}
              aria-invalid={invalid}
              aria-describedby={`settings-${name}-hint settings-${name}-error`}
            />
            <TableText tone="hint">{t(`settings.units.${unit}`)}</TableText>
          </div>
        )}
      />,
      invalid,
    );
  }
  function toggle(name: 'requireUppercase' | 'requireLowercase' | 'requireNumber' | 'requireSymbol') {
    return row(
      name,
      <Controller
        name={`credentials.${name}`}
        control={form.control}
        render={({ field }) => (
          <Switch
            id={`settings-${name}`}
            checked={field.value}
            onCheckedChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            disabled={!canUpdate || pending}
            aria-describedby={`settings-${name}-hint`}
          />
        )}
      />,
    );
  }
  function group(title: string, rows: ReactNode[]) {
    return (
      <PageSection
        title={t(`settings.groups.${title}`)}
        variant="card"
        className="p-0 [&>div:first-child]:px-5 [&>div:first-child]:py-3"
      >
        {rows.map((item, index) => (
          <Fragment key={index}>
            <PageDivider />
            {item}
          </Fragment>
        ))}
      </PageSection>
    );
  }
  return (
    <>
      <form
        onSubmit={(event) => void submit(event)}
        className="flex min-h-0 flex-1"
        aria-label={t('settings.title')}
      >
        <SideList
          className="w-[calc(230px*var(--app-scale))]"
          items={settingsSections.map((id) => ({
            id,
            label: t(`settings.sections.${id}`),
            ariaLabel: t(`settings.sections.${id}`),
          }))}
          activeId={section}
          onSelect={(id) => {
            const selected = settingsSections.find((key) => key === id);
            if (selected) setSection(selected);
          }}
        />
        <PagePane variant="detail" className="flex-1">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-9 py-5">
            <ListPageHeader title={t(`settings.sections.${section}`)} count={t('settings.scope')} />
            {!canUpdate && (
              <Alert>
                <AlertDescription>{t('settings.readOnly')}</AlertDescription>
              </Alert>
            )}
            {section === 'general' &&
              group('general', [textField('appName', 64), textField('loginDescription', 200)])}
            {section === 'security' && (
              <>
                {group('login', [
                  numberField('lockThreshold', 1, 100),
                  numberField('ipLockThreshold', 1, 1000),
                  numberField('lockWindowMs', 1 / 60, 1440, 60000, 'minutes'),
                ])}
                {group('session', [
                  numberField('sessionTtlMs', 1, 43200, 60000, 'minutes'),
                  numberField('sessionRememberTtlMs', 1 / 1440, 30, 86400000, 'days'),
                ])}
                <TableText tone="weak" className="whitespace-normal">
                  {t('settings.sessionHint')}
                </TableText>
              </>
            )}
            {section === 'credentials' && (
              <>
                {group('password', [
                  numberField('minLength', 8, 128, 1, 'characters'),
                  toggle('requireUppercase'),
                  toggle('requireLowercase'),
                  toggle('requireNumber'),
                  toggle('requireSymbol'),
                ])}
                <TableText tone="weak" className="whitespace-normal">
                  {t('settings.passwordHint')}
                </TableText>
              </>
            )}
            {section === 'uploads' && (
              <>
                {group('uploads', [numberField('avatarMaxMiB', 1, 10, 1, 'mib')])}
                <TableText tone="weak" className="whitespace-normal">
                  {t('settings.uploadHint')}
                </TableText>
              </>
            )}
            <div className="flex-1" />
            {mutation.error && (
              <Alert variant="destructive">
                <AlertDescription>{settingsError(mutation.error, t)}</AlertDescription>
              </Alert>
            )}
            {saved && !dirty && (
              <TableText role="status" tone="success">
                {t('settings.saved')}
              </TableText>
            )}
            {dirty && (
              <Alert>
                <AlertDescription>
                  <div className="flex flex-wrap items-center gap-2">
                    <TableText tone="strong">{t('settings.unsaved', { count: changes })}</TableText>
                    <TableText className="whitespace-normal">{t('settings.unsavedHint')}</TableText>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <PagePaneFooter
            variant="form"
            hint={
              baseline.updatedAt
                ? t('settings.updatedAt', { date: new Date(baseline.updatedAt).toLocaleString() })
                : t('settings.defaults')
            }
          >
            {canUpdate && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!dirty || pending}
                  onClick={() => setDiscardOpen(true)}
                >
                  {t('settings.discard')}
                </Button>
                <Button type="submit" variant="primary" loading={pending} disabled={!dirty}>
                  {t('settings.save')}
                </Button>
              </>
            )}
          </PagePaneFooter>
        </PagePane>
      </form>
      <ConfirmDialog
        open={discardOpen || blocker.status === 'blocked'}
        severity="reversible"
        title={t('settings.discardTitle')}
        description={t('settings.discardDescription')}
        cancelText={t('settings.keepEditing')}
        confirmText={t('settings.discardConfirm')}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) {
            setDiscardOpen(false);
            if (blocker.status === 'blocked') blocker.reset();
          }
        }}
        onConfirm={() => {
          if (blocker.status === 'blocked') blocker.proceed();
          else discard();
        }}
      />
    </>
  );
}
