import { useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { NoticeEditorChrome, NoticeSettingsGroup } from '@/components/pro/NoticeEditorChrome';
import { MarkdownEditor } from '@/components/pro/MarkdownEditor';
import { MarkdownContent } from '@/components/pro/MarkdownContent';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { authzContext, matchPermission } from '@/lib/permission';
import { CreateNoticeSchema, noticeAudienceOptionsQuery, useNoticeMutations, type NoticeDto } from '../api';
import { buildNoticePatch, noticeErrorKey, noticeStatusTone, noticeTime } from '../model';
import { NoticeActions } from '../detail/NoticeActions';
import type { NoticeEditorProps } from '../detail/NoticeEditor';

export function NoticeForm({
  initial,
  permissions,
  systemAdmin,
  onDirtyChange,
  onCreated,
  onDeleted,
  onClose,
}: Omit<NoticeEditorProps, 'id' | 'onClose'> & { initial?: NoticeDto; onClose?: () => void }) {
  const { t } = useTranslation('admin');
  const [baseline, setBaseline] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(initial?.status === 'scheduled');
  const [scheduledAt, setScheduledAt] = useState('');
  const mutations = useNoticeMutations();
  const options = useQuery(noticeAudienceOptionsQuery);
  const authz = authzContext(permissions, systemAdmin);
  const editable =
    (!baseline || baseline.status === 'draft') &&
    matchPermission(authz, baseline ? 'iam:notice:update' : 'iam:notice:create');
  const form = useForm<z.input<typeof CreateNoticeSchema>, unknown, z.output<typeof CreateNoticeSchema>>({
    resolver: zodResolver(CreateNoticeSchema),
    defaultValues: {
      title: baseline?.title ?? '',
      content: baseline?.content ?? '',
      severity: baseline?.severity ?? 'normal',
      audience: baseline?.audience ?? 'all',
      audienceIds: baseline?.audienceIds ?? [],
      pinned: baseline?.pinned ?? false,
      requireConfirmation: baseline?.requireConfirmation ?? false,
    },
  });
  const values = useWatch({ control: form.control });
  const dirty = form.formState.isDirty;
  const pendingSchedule = baseline?.status === 'draft' && (scheduleEnabled || scheduledAt !== '');
  useEffect(() => {
    onDirtyChange(dirty || pendingSchedule);
  }, [dirty, pendingSchedule, onDirtyChange]);
  if (!dirty && initial && baseline?.version !== initial.version) setBaseline(initial);
  useEffect(() => {
    if (!dirty && initial) {
      form.reset({
        title: initial.title,
        content: initial.content,
        severity: initial.severity,
        audience: initial.audience,
        audienceIds: initial.audienceIds,
        pinned: initial.pinned,
        requireConfirmation: initial.requireConfirmation,
      });
    }
  }, [initial, dirty, form]);
  const pending = mutations.create.isPending || mutations.update.isPending;
  const [saveError, setSaveError] = useState<unknown>(null);
  const submit = form.handleSubmit(async (data) => {
    setSaveError(null);
    try {
      const patch = baseline ? buildNoticePatch(baseline, data) : null;
      if (baseline && !patch) {
        form.reset(data);
        return;
      }
      const saved =
        baseline && patch
          ? await mutations.update.mutateAsync({ ...patch, id: baseline.id, version: baseline.version })
          : await mutations.create.mutateAsync(data);
      setBaseline(saved);
      form.reset(data);
      if (!baseline) onCreated(saved.id);
    } catch (error) {
      setSaveError(error);
    }
  });
  const choices = values.audience === 'departments' ? options.data?.departments : options.data?.roles;
  return (
    <>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => void submit(event)}
        aria-label={t('notices.formLabel')}
      >
        <NoticeEditorChrome
          title={t(baseline ? 'notices.edit' : 'notices.createTitle')}
          status={
            baseline ? (
              <StatusBadge showDot={false} tone={noticeStatusTone(baseline.status)}>
                {t(`notices.status.${baseline.status}`)}
                {baseline.status === 'draft' ? ` · ${dirty ? t('notices.unsaved') : t('notices.saved')}` : ''}
              </StatusBadge>
            ) : undefined
          }
          actions={
            onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('notices.close')}
                onClick={onClose}
              >
                <X aria-hidden="true" />
              </Button>
            ) : undefined
          }
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setPreview(true)}>
                {t('notices.preview')}
              </Button>
              <span className="flex-1" />
              {editable && (
                <Button
                  type="submit"
                  variant="secondary"
                  loading={pending}
                  disabled={
                    (!!baseline && !dirty) ||
                    (values.audience !== 'all' && (options.isPending || options.isError))
                  }
                >
                  {t('notices.save')}
                </Button>
              )}
              <NoticeActions
                notice={baseline}
                permissions={permissions}
                systemAdmin={systemAdmin}
                dirty={dirty}
                scheduleEnabled={scheduleEnabled}
                scheduledAt={scheduledAt}
                onChanged={(notice) => {
                  setBaseline(notice);
                  if (notice.status === 'draft') {
                    setScheduleEnabled(false);
                    setScheduledAt('');
                  }
                }}
                onDeleted={onDeleted}
              />
            </>
          }
        >
          <Field>
            <FieldLabel htmlFor="notice-title">{t('notices.fields.title')}</FieldLabel>
            <Input
              id="notice-title"
              {...form.register('title')}
              disabled={!editable || pending}
              maxLength={120}
              aria-invalid={!!form.formState.errors.title}
            />
            <FieldError>{form.formState.errors.title ? t('notices.invalidTitle') : null}</FieldError>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="notice-severity">{t('notices.fields.severity')}</FieldLabel>
              <Controller
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <SelectControl
                    id="notice-severity"
                    value={field.value ?? 'normal'}
                    options={['normal', 'important', 'urgent'].map((value) => ({
                      value,
                      label: t(`notices.severity.${value}`),
                    }))}
                    onValueChange={field.onChange}
                    disabled={!editable || pending}
                  />
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="notice-audience">{t('notices.fields.audience')}</FieldLabel>
              <Controller
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <SelectControl
                    id="notice-audience"
                    value={field.value ?? 'all'}
                    options={['all', 'departments', 'roles'].map((value) => ({
                      value,
                      label: t(`notices.audience.${value}`),
                    }))}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('audienceIds', [], { shouldDirty: true });
                    }}
                    disabled={!editable || pending}
                  />
                )}
              />
            </Field>
          </div>
          {values.audience !== 'all' && (
            <Field>
              <FieldLabel>{t('notices.targets')}</FieldLabel>
              <Controller
                control={form.control}
                name="audienceIds"
                render={({ field }) => (
                  <div className="grid max-h-40 gap-2 overflow-y-auto">
                    {choices?.map((choice) => (
                      <FieldLabel key={choice.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={field.value?.includes(choice.id) ?? false}
                          disabled={!editable || pending}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...(field.value ?? []), choice.id]
                                : (field.value ?? []).filter((id) => id !== choice.id),
                            )
                          }
                        />
                        {choice.name}
                      </FieldLabel>
                    ))}
                    {field.value
                      ?.filter((id) => !choices?.some((choice) => choice.id === id))
                      .map((id) => (
                        <FieldLabel key={id} className="flex items-center gap-2">
                          <Checkbox
                            checked
                            disabled={!editable || pending}
                            onCheckedChange={() =>
                              field.onChange(field.value?.filter((value) => value !== id))
                            }
                          />
                          {t('notices.unavailableTarget')}
                        </FieldLabel>
                      ))}
                    {options.isError && (
                      <Button type="button" variant="secondary" onClick={() => void options.refetch()}>
                        {t('messages.retry')}
                      </Button>
                    )}
                    {!options.isPending && choices?.length === 0 && (
                      <TableText tone="weak">{t('notices.noTargets')}</TableText>
                    )}
                  </div>
                )}
              />
              <FieldError>
                {form.formState.errors.audienceIds
                  ? t('notices.invalidTargets')
                  : options.isError
                    ? t('notices.loadFailed')
                    : null}
              </FieldError>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor={editable ? 'notice-content' : undefined}>
              {t('notices.fields.content')}
            </FieldLabel>
            {editable ? (
              <Controller
                control={form.control}
                name="content"
                render={({ field }) => (
                  <MarkdownEditor
                    id="notice-content"
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={!editable || pending}
                    invalid={!!form.formState.errors.content}
                    maxLength={20000}
                    labels={{
                      bold: t('notices.editor.bold'),
                      italic: t('notices.editor.italic'),
                      heading: t('notices.editor.heading'),
                      list: t('notices.editor.list'),
                      link: t('notices.editor.link'),
                      preview: t('notices.editor.preview'),
                      edit: t('notices.editor.edit'),
                      placeholder: t('notices.editor.placeholder'),
                      help: t('notices.editor.help'),
                    }}
                  />
                )}
              />
            ) : (
              <div role="region" aria-label={t('notices.fields.content')}>
                <MarkdownContent content={values.content ?? ''} />
              </div>
            )}
            <FieldError>{form.formState.errors.content ? t('notices.invalidContent') : null}</FieldError>
          </Field>
          <NoticeSettingsGroup>
            <Controller
              control={form.control}
              name="pinned"
              render={({ field }) => (
                <FieldLabel className="flex items-center justify-between gap-2">
                  {t('notices.pinned')}
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    disabled={!editable || pending}
                  />
                </FieldLabel>
              )}
            />
            <Controller
              control={form.control}
              name="requireConfirmation"
              render={({ field }) => (
                <FieldLabel className="flex items-center justify-between gap-2">
                  <span>
                    {t('notices.requireConfirmation')}{' '}
                    <TableText tone="hint">{t('notices.confirmationHint')}</TableText>
                  </span>
                  <Switch
                    aria-label={t('notices.requireConfirmation')}
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    disabled={!editable || pending}
                  />
                </FieldLabel>
              )}
            />
            <FieldLabel
              className="flex items-center justify-between gap-2"
              title={!baseline ? t('notices.saveBeforeSchedule') : undefined}
            >
              {t('notices.schedule')}
              <span className="flex items-center gap-2">
                {baseline?.status === 'scheduled' && (
                  <TableText tone="hint" mono>
                    {noticeTime(baseline.scheduledAt)}
                  </TableText>
                )}
                <Switch
                  aria-label={t('notices.schedule')}
                  checked={baseline?.status === 'scheduled' || scheduleEnabled}
                  onCheckedChange={(enabled) => {
                    setScheduleEnabled(enabled);
                    if (!enabled) setScheduledAt('');
                  }}
                  disabled={
                    !baseline || baseline.status !== 'draft' || !matchPermission(authz, 'iam:notice:publish')
                  }
                />
              </span>
            </FieldLabel>
            {scheduleEnabled && (!baseline || baseline.status === 'draft') && (
              <Field>
                <FieldLabel htmlFor="notice-scheduled-at">{t('notices.scheduledAt')}</FieldLabel>
                <Input
                  id="notice-scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
              </Field>
            )}
          </NoticeSettingsGroup>
          {dirty && baseline && <TableText tone="hint">{t('notices.saveBeforePublish')}</TableText>}
          <FieldError>{saveError ? t(noticeErrorKey(saveError)) : null}</FieldError>
        </NoticeEditorChrome>
      </form>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent>
          <DialogTitle>{values.title || t('notices.preview')}</DialogTitle>
          <DialogDescription>{t('notices.previewDescription')}</DialogDescription>
          <div className="max-h-96 overflow-y-auto">
            <MarkdownContent content={values.content ?? ''} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
