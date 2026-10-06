import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { SettingsScene } from './list/SettingsScene';
import type { SettingsPageProps } from './types';
export function SettingsPage(props: SettingsPageProps) {
  const { t } = useTranslation('admin');
  return (
    <PageFrame breadcrumbs={[{ label: t('settings.title') }]}>
      <PageSurface>
        <SettingsScene {...props} />
      </PageSurface>
    </PageFrame>
  );
}
export { PublicSystemText } from './components/PublicSystemText';
export { PasswordPolicyHint } from './components/PasswordPolicyHint';
