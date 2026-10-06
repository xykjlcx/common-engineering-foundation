import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { InlineNotice } from '@/components/pro/InlineNotice';
import { SegmentedControl } from '@/components/pro/SegmentedControl';
import { Field, FieldLabel } from '@/components/ui/field';
import { Dialog } from '@/components/ui/dialog';
import { useUserMutations, type UserDto, type UserTargets } from '../api';

const statuses = ['active', 'probation', 'left'] as const;

export function UserEmploymentDialog({
  target,
  name,
  status,
  onClose,
}: {
  target: UserTargets[number];
  name?: string;
  status: UserDto['status'];
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const [next, setNext] = useState(status ?? '');
  const { changeEmployment } = useUserMutations();
  const rehire = status === 'left' && next !== 'left';
  const leaving = status !== 'left' && next === 'left';
  const submit = async () => {
    if (next !== 'active' && next !== 'probation' && next !== 'left') return;
    await changeEmployment.mutateAsync({ ...target, action: rehire ? 'rehire' : 'set', status: next });
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
        title={t('users.actions.employment')}
        description={t('users.employment.description')}
        error={changeEmployment.isError ? t('users.form.saveFailed') : undefined}
        cancelText={t('users.actions.cancel')}
        submitText={t(
          rehire
            ? 'users.employment.rehire'
            : next === 'left'
              ? 'users.employment.leave'
              : 'users.actions.save',
        )}
        submitLoading={changeEmployment.isPending}
        submitDisabled={!next || next === status}
        onCancel={onClose}
        onSubmit={submit}
      >
        <Field>
          <FieldLabel htmlFor="employment-status">{t('users.employment.label')}</FieldLabel>
          <SegmentedControl
            id="employment-status"
            aria-label={t('users.employment.label')}
            value={next === '' ? null : next}
            disabled={changeEmployment.isPending}
            options={statuses.map((value) => ({ value, label: t(`users.status.${value}`) }))}
            onValueChange={setNext}
          />
        </Field>
        {name && leaving && (
          <InlineNotice tone="warning">
            {status
              ? t('users.employment.noticeLeave', { name, status: t(`users.status.${status}`) })
              : t('users.employment.noticeLeaveUnset', { name })}
          </InlineNotice>
        )}
        {name && rehire && (
          <InlineNotice tone="warning">{t('users.employment.noticeRehire', { name })}</InlineNotice>
        )}
      </FormDialogContent>
    </Dialog>
  );
}
