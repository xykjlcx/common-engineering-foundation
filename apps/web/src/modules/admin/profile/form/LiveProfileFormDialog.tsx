import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { UpdateOwnProfileSchema } from '@keel/core/profile-contract';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { BizError } from '@/lib/http/errors';
import type { LiveProfileDto, LiveProfilePatch } from '../api/live-profile';

export function LiveProfileFormDialog({
  profile,
  onClose,
  onSubmit,
}: {
  profile: LiveProfileDto;
  onClose: () => void;
  onSubmit: (patch: LiveProfilePatch) => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const locked = useRef(false);
  const form = useForm<LiveProfilePatch>({
    resolver: zodResolver(UpdateOwnProfileSchema),
    defaultValues: {
      version: profile.version,
      name: profile.name,
      phone: profile.phone,
      workLocation: profile.workLocation ?? '',
      remark: profile.remark ?? '',
    },
  });
  const close = () => {
    if (!locked.current) onClose();
  };
  const submit = () =>
    form.handleSubmit(async (values) => {
      if (locked.current) return;
      locked.current = true;
      form.clearErrors('root');
      try {
        await onSubmit(values);
        onClose();
      } catch (error) {
        form.setError('root', {
          message: t(
            error instanceof BizError && error.code === 'user.version_conflict'
              ? 'profile.live.conflict'
              : 'profile.live.saveFailed',
          ),
        });
      } finally {
        locked.current = false;
      }
    })();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <FormDialogContent
        title={t('profile.form.title')}
        cancelText={t('profile.actions.cancel')}
        submitText={t('profile.actions.save')}
        submitLoading={form.formState.isSubmitting}
        onCancel={close}
        onSubmit={submit}
        error={form.formState.errors.root?.message}
      >
        {(['name', 'phone', 'workLocation', 'remark'] as const).map((field) => {
          const id = `own-profile-${field}`;
          const label = t(
            `profile.fields.${field === 'workLocation' ? 'location' : field === 'remark' ? 'bio' : field}`,
          );
          const error = form.formState.errors[field];
          const props = {
            id,
            'aria-label': label,
            'aria-invalid': !!error,
            'aria-describedby': error ? `${id}-error` : undefined,
            disabled: form.formState.isSubmitting,
            ...form.register(field),
          };
          return (
            <Field key={field} data-invalid={!!error}>
              <FieldLabel htmlFor={id} required={field === 'name'}>
                {label}
              </FieldLabel>
              {field === 'remark' ? <Textarea {...props} /> : <Input {...props} />}
              <FieldError id={`${id}-error`}>{error ? t('profile.live.invalidField') : null}</FieldError>
            </Field>
          );
        })}
      </FormDialogContent>
    </Dialog>
  );
}
