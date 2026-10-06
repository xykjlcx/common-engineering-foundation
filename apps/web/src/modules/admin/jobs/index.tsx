import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { JobsScene } from './list/JobsScene';
import type { JobsPageProps } from './types';
export function JobsPage(props: JobsPageProps) {
  const { t } = useTranslation('admin');
  return (
    <PageFrame breadcrumbs={[{ label: t('jobs.title') }]}>
      <PageSurface>
        <JobsScene {...props} />
      </PageSurface>
    </PageFrame>
  );
}
