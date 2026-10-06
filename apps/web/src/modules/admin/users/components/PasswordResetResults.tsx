import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ResetPasswordOutcome } from '../types';

export function PasswordResetResults({
  outcome,
  onClose,
}: {
  outcome: ResetPasswordOutcome;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const [copyFailed, setCopyFailed] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        outcome.items.map((item) => `${item.username}\t${item.password}`).join('\n'),
      );
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.confirm.resetPassword.doneTitle')}</DialogTitle>
          <DialogDescription>{t('users.passwordResults.description')}</DialogDescription>
        </DialogHeader>
        <DescriptionList
          columns={1}
          density="compact"
          items={outcome.items.map((item) => ({ label: item.username, value: item.password, mono: true }))}
        />
        <FieldError role="alert">{copyFailed ? t('users.passwordResults.copyFailed') : null}</FieldError>
        <DialogFooter>
          <Button variant="secondary" onClick={() => void copy()}>
            {t('users.passwordResults.copy')}
          </Button>
          <Button onClick={onClose}>{t('users.actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
