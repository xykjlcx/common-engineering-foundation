import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChangeAccountPolicySchema } from '@keel/core/user-contract';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/pro/DatePicker';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { formatDateValue } from '@/components/ui/calendar';
import { BizError } from '@/lib/http/errors';
import { useAccountPolicyMutation, type AccountPolicyInput } from '../api/account-policy';

export function UserAccountPolicyDialog({
  initial,
  onClose,
}: {
  initial: AccountPolicyInput;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('admin');
  // 弹窗一次打开就是一个编辑会话；后台详情回读不能给旧草稿补上新版本。
  const [baseline] = useState(initial);
  const form = useForm<AccountPolicyInput>({
    resolver: zodResolver(ChangeAccountPolicySchema),
    defaultValues: baseline,
  });
  const mutation = useAccountPolicyMutation();
  const pending = mutation.isPending || form.formState.isSubmitting;
  const submit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync({ ...values, id: baseline.id, version: baseline.version });
    onClose();
  });
  const failure =
    mutation.error instanceof BizError && mutation.error.code === 'user.version_conflict'
      ? t('users.accountPolicy.versionConflict')
      : mutation.error instanceof BizError && mutation.error.status === 403
        ? t('users.accountPolicy.forbidden')
        : t('users.form.saveFailed');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <FormDialogContent
        title={t('users.accountPolicy.title')}
        description={t('users.accountPolicy.description')}
        error={mutation.isError ? failure : undefined}
        cancelText={t('users.actions.cancel')}
        submitText={t('users.accountPolicy.apply')}
        submitLoading={pending}
        onCancel={onClose}
        onSubmit={submit}
      >
        <Controller
          control={form.control}
          name="effectiveAt"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel htmlFor="policy-effective-at">{t('users.accountPolicy.effectiveAt')}</FieldLabel>
              <DatePicker
                id="policy-effective-at"
                ref={field.ref}
                onBlur={field.onBlur}
                showTime
                withSeconds
                allowClear
                disabled={pending}
                aria-label={t('users.accountPolicy.effectiveAt')}
                aria-invalid={fieldState.invalid || undefined}
                aria-describedby="policy-effective-hint policy-effective-error"
                placeholder={t('users.form.datePicker.placeholderTime')}
                locale={i18n.language}
                labels={{
                  today: t('users.form.datePicker.today'),
                  clear: t('users.form.datePicker.clear'),
                  confirm: t('users.form.datePicker.confirm'),
                  now: t('users.form.datePicker.now'),
                  time: t('users.form.datePicker.time'),
                }}
                value={field.value ? formatDateValue(new Date(field.value), true, true) : null}
                onChange={(next) =>
                  field.onChange(next ? new Date(next.replace(' ', 'T')).toISOString() : null)
                }
              />
              <FieldDescription id="policy-effective-hint">
                {t('users.accountPolicy.effectiveHint')}
              </FieldDescription>
              <FieldError id="policy-effective-error">
                {fieldState.error ? t('users.accountPolicy.invalidDate') : null}
              </FieldError>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="mustChangePassword"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="policy-password" className="flex items-center gap-2.5">
                <Switch
                  id="policy-password"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value)}
                  disabled={pending}
                />
                {t('users.accountPolicy.mustChangePassword')}
              </FieldLabel>
            </Field>
          )}
        />
      </FormDialogContent>
    </Dialog>
  );
}
