import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { PostsScene } from './list/PostsScene';
import type { PostsPageProps } from './types';

export function PostsPage(props: PostsPageProps) {
  const { t } = useTranslation('admin');

  return (
    <PageFrame breadcrumbs={[{ label: t('posts.title') }]}>
      <PageSurface>
        <PostsScene {...props} />
      </PageSurface>
    </PageFrame>
  );
}
