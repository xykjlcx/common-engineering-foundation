import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FieldLabel, FieldError } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { QueryState } from '@/components/pro/QueryState';
import { messagePreferencesQuery, useMessageMutations } from '../api';
export function MessagePreferencesDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('admin');
  const query = useQuery(messagePreferencesQuery);
  const { savePreferences } = useMessageMutations();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{t('messages.preferences')}</DialogTitle>
        <DialogDescription>{t('messages.preferenceDescription')}</DialogDescription>
        <QueryState
          data={query.data}
          pending={query.isPending}
          error={query.isError}
          loadingLabel={t('messages.loading')}
          errorLabel={t('messages.loadFailed')}
          retryLabel={t('messages.retry')}
          onRetry={() => void query.refetch()}
        >
          {(preferences) => (
            <FieldLabel className="flex items-center justify-between gap-3">
              {t('messages.badgeEnabled')}
              <Switch
                checked={preferences.badgeEnabled}
                disabled={savePreferences.isPending}
                onCheckedChange={(badgeEnabled) => savePreferences.mutate({ badgeEnabled })}
              />
            </FieldLabel>
          )}
        </QueryState>
        <FieldError>{savePreferences.isError ? t('messages.actionFailed') : null}</FieldError>
      </DialogContent>
    </Dialog>
  );
}
