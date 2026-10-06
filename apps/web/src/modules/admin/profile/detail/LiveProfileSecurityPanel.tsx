import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TableText } from '@/components/pro/TableText';
import { DetailSection, PageDivider } from '@/components/pro/page-scaffold';
import { liveSessionsQuery } from '../api/live-profile';

export function LiveProfileSecurityPanel({
  onChangePassword,
  onViewDevices,
}: {
  onChangePassword: () => Promise<void>;
  onViewDevices: () => void;
}) {
  const { t } = useTranslation('admin');
  const sessions = useQuery(liveSessionsQuery);

  return (
    <DetailSection title={t('profile.sections.security')}>
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="grid gap-1">
          <TableText tone="strong">{t('profile.password.label')}</TableText>
          <TableText tone="weak">{t('profile.live.passwordHint')}</TableText>
        </div>
        <Button variant="outline" onClick={() => void onChangePassword()}>
          {t('profile.password.action')}
        </Button>
      </div>
      <PageDivider className="my-2" />
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="grid gap-1">
          <TableText tone="strong">{t('profile.sections.devices')}</TableText>
          <TableText tone="weak">
            {sessions.data
              ? t('profile.live.sessionsHint', { count: sessions.data.sessions.length })
              : t(sessions.isError ? 'profile.live.loadFailed' : 'profile.live.loadingSessions')}
          </TableText>
        </div>
        <Button variant="outline" onClick={onViewDevices}>
          {t('profile.actions.view')}
        </Button>
      </div>
    </DetailSection>
  );
}
