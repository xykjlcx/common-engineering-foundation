import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { DictsScene } from './list/DictsScene';
import type { DictPageProps } from './types';

export function DictsPage(props: DictPageProps) {
  const { t } = useTranslation('admin');

  return (
    <PageFrame breadcrumbs={[{ label: t('dicts.title') }]}>
      <PageSurface>
        <DictsScene {...props} />
      </PageSurface>
    </PageFrame>
  );
}
