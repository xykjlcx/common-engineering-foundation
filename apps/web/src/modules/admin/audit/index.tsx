import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { AuditScene } from './list/AuditScene';
import type { AuditPageProps } from './types';

export function AuditPage(props: AuditPageProps) {
  const { t } = useTranslation('admin');

  return (
    <PageFrame breadcrumbs={[{ label: t('audit.title') }]}>
      <PageSurface>
        <AuditScene {...props} />
      </PageSurface>
    </PageFrame>
  );
}
