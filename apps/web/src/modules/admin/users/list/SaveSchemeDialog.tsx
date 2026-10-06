import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import { useFilterSchemeMutations } from '../api';

/** 保存当前条件；共享发布资格来自当前身份，最终由后端验证。 */
export function SaveSchemeDialog({
  open,
  filters,
  canShare = false,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  filters: string;
  canShare?: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (schemeId: string) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  const { createScheme } = useFilterSchemeMutations();
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'mine' | 'shared'>('mine');
  const close = () => {
    if (createScheme.isPending) return;
    setName('');
    setScope('mine');
    createScheme.reset();
    onOpenChange(false);
  };
  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !filters || createScheme.isPending) return;
    try {
      const scheme = await createScheme.mutateAsync({
        name: trimmed,
        filters,
        scope: canShare ? scope : 'mine',
      });
      setName('');
      setScope('mine');
      onOpenChange(false);
      onSaved(scheme.id);
    } catch {
      /* mutation.error 留在弹窗，保留输入供修正重试。 */
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <FormDialogContent
        size="sm"
        title={t('users.filters.saveScheme')}
        description={t('users.filters.saveSchemeDesc')}
        cancelText={t('users.actions.cancel')}
        submitText={t('users.actions.save')}
        submitDisabled={name.trim() === '' || filters === ''}
        submitLoading={createScheme.isPending}
        error={createScheme.isError ? t('users.filters.schemeSaveFailed') : undefined}
        onCancel={close}
        onSubmit={submit}
      >
        <Field>
          <FieldLabel htmlFor="user-scheme-name">{t('users.filters.schemeName')}</FieldLabel>
          <Input
            id="user-scheme-name"
            value={name}
            disabled={createScheme.isPending}
            autoComplete="off"
            placeholder={t('users.filters.schemeNamePlaceholder')}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {canShare ? (
          <Field>
            <FieldLabel htmlFor="user-scheme-scope">{t('users.filters.schemeScope')}</FieldLabel>
            <SelectControl
              id="user-scheme-scope"
              value={scope}
              disabled={createScheme.isPending}
              options={[
                { value: 'mine', label: t('users.filters.schemeMine') },
                { value: 'shared', label: t('users.filters.schemeShared') },
              ]}
              onValueChange={(value) => {
                if (value === 'mine' || value === 'shared') setScope(value);
              }}
            />
          </Field>
        ) : null}
      </FormDialogContent>
    </Dialog>
  );
}
