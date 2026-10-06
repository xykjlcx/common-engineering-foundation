import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { MessagesScene } from './list/MessagesScene';
import type { MessagesPageProps } from './types';
export { PendingNoticesDialog } from './components/PendingNoticesDialog';
export function MessagesPage(props: MessagesPageProps) {
  const { t } = useTranslation('admin');
  return (
    <PageFrame breadcrumbs={[{ label: t('messages.title') }]}>
      <PageSurface>
        <MessagesScene {...props} />
      </PageSurface>
    </PageFrame>
  );
}
