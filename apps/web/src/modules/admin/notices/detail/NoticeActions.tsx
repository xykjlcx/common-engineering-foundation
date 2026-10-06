import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { RowActionsMenu } from '@/components/pro/RowActionsMenu';
import { Button } from '@/components/ui/button';
import { authzContext, matchPermission } from '@/lib/permission';
import { useNoticeMutations, type NoticeDto } from '../api';
import { noticeErrorKey, scheduledIso } from '../model';
type Command = 'publish' | 'schedule' | 'cancelSchedule' | 'withdraw' | 'delete';
export function NoticeActions({
  notice,
  permissions,
  systemAdmin,
  dirty,
  scheduleEnabled,
  scheduledAt,
  onChanged,
  onDeleted,
}: {
  notice?: NoticeDto;
  permissions: string[];
  systemAdmin?: boolean;
  dirty: boolean;
  scheduleEnabled: boolean;
  scheduledAt: string;
  onChanged: (notice: NoticeDto) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation('admin');
  const mutations = useNoticeMutations();
  const authz = authzContext(permissions, systemAdmin);
  const [command, setCommand] = useState<Command | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [invalidSchedule, setInvalidSchedule] = useState(false);
  const run = async () => {
    if (!command || !notice) return;
    const input = { id: notice.id, version: notice.version };
    setError(null);
    try {
      if (command === 'delete') {
        await mutations.delete.mutateAsync(input);
        onDeleted();
      } else if (command === 'schedule') {
        const at = scheduledIso(scheduledAt);
        if (!at) {
          setInvalidSchedule(true);
          return;
        }
        onChanged(await mutations.schedule.mutateAsync({ ...input, scheduledAt: at }));
      } else onChanged(await mutations[command].mutateAsync(input));
      setCommand(null);
    } catch (cause) {
      setError(cause);
    }
  };
  const open = (next: Command) => {
    setError(null);
    setInvalidSchedule(false);
    setCommand(next);
  };
  return (
    <>
      {(!notice || notice.status === 'draft') && matchPermission(authz, 'iam:notice:publish') && (
        <Button
          type="button"
          disabled={!notice || dirty || (scheduleEnabled && !scheduledAt)}
          onClick={() => open(scheduleEnabled ? 'schedule' : 'publish')}
        >
          {t(scheduleEnabled ? 'notices.schedule' : 'notices.publish')}
        </Button>
      )}
      {notice?.status === 'scheduled' && matchPermission(authz, 'iam:notice:publish') && (
        <Button type="button" variant="secondary" onClick={() => open('cancelSchedule')}>
          {t('notices.cancelSchedule')}
        </Button>
      )}
      {notice?.status === 'published' && matchPermission(authz, 'iam:notice:withdraw') && (
        <Button type="button" variant="secondary" onClick={() => open('withdraw')}>
          {t('notices.withdraw')}
        </Button>
      )}
      {notice &&
        (notice.status === 'draft' || notice.status === 'withdrawn') &&
        matchPermission(authz, 'iam:notice:delete') && (
          <RowActionsMenu
            revealed
            mask={false}
            ariaLabel={t('notices.moreActions')}
            items={[
              {
                id: 'delete',
                label: t('notices.delete'),
                tone: 'danger',
                disabled: dirty,
                onSelect: () => open('delete'),
              },
            ]}
          />
        )}
      <ConfirmDialog
        open={command !== null}
        title={command ? t(`notices.${command}`) : ''}
        description={command ? t(`notices.confirmDescriptions.${command}`, { title: notice?.title }) : ''}
        cancelText={t('notices.cancel')}
        confirmText={command ? t(`notices.${command}`) : ''}
        confirmVariant={command === 'publish' || command === 'schedule' ? 'primary' : undefined}
        severity={command === 'delete' ? 'irreversible' : 'impact'}
        confirmation={
          command === 'delete' && notice
            ? { label: t('notices.confirmTitle'), expected: notice.title }
            : undefined
        }
        error={error ? t(noticeErrorKey(error)) : invalidSchedule ? t('notices.invalidSchedule') : undefined}
        onOpenChange={(open) => !open && setCommand(null)}
        onConfirm={run}
      />
    </>
  );
}
