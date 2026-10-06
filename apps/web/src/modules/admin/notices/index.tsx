import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { NoticesScene } from './list/NoticesScene';
import type { NoticesPageProps } from './types';
export function NoticesPage(props: NoticesPageProps) {
  const { t } = useTranslation('admin');
  return (
    <PageFrame breadcrumbs={[{ label: t('notices.title') }]}>
      <PageSurface>
        <NoticesScene {...props} />
      </PageSurface>
    </PageFrame>
  );
}
