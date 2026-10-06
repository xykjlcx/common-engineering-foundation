import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { dictTypeQuery, dictItemQuery, useDictMutations } from '../api';
import { dictError } from '../model';

export function DictDeleteDialog({
  kind,
  id,
  onClose,
}: {
  kind: 'type' | 'item';
  id: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const type = useQuery({ ...dictTypeQuery(id), enabled: kind === 'type' });
  const item = useQuery({ ...dictItemQuery(id), enabled: kind === 'item' });
  const data = kind === 'type' ? type.data : item.data;
  const mutations = useDictMutations();
  const mutation = kind === 'type' ? mutations.deleteType : mutations.deleteItem;
  const error = mutation.error ?? (kind === 'type' ? type.error : item.error);
  const name = data ? ('name' in data ? data.name : `${data.label} (${data.value})`) : '';

  return (
    <ConfirmDialog
      open
      title={t('dicts.deleteTitle')}
      description={t('dicts.deleteDescription', { name })}
      severity="irreversible"
      confirmation={{ label: t('dicts.name'), expected: name || id }}
      cancelText={t('dicts.cancel')}
      confirmText={t('dicts.delete')}
      pending={mutation.isPending || (!data && !error)}
      error={error ? dictError(error, t) : undefined}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={async () => {
        if (!data) return;
        await mutation.mutateAsync({ id, version: data.version });
        onClose();
      }}
    />
  );
}
