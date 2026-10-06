import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { postDetailQuery, usePostMutations } from '../api';
import { postError } from '../model';

export function PostDeleteDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation('admin');
  const query = useQuery(postDetailQuery(id));
  const mutations = usePostMutations();
  const error = mutations.delete.error ?? query.error;

  return (
    <ConfirmDialog
      open
      title={t('posts.delete')}
      description={t('posts.deleteDescription', { name: query.data?.name ?? '' })}
      severity="irreversible"
      confirmation={{ label: t('posts.columns.name'), expected: query.data?.name ?? id }}
      cancelText={t('posts.actions.cancel')}
      confirmText={t('posts.delete')}
      pending={mutations.delete.isPending || (!query.data && !error)}
      error={error ? postError(error, t) : undefined}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={async () => {
        if (!query.data) return;
        await mutations.delete.mutateAsync({ id, version: query.data.version });
        onClose();
      }}
    />
  );
}
