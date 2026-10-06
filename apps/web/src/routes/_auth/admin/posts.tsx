import { createFileRoute } from '@tanstack/react-router';
import { PostsPage } from '@/modules/admin/posts';
import { postsSearchSchema } from '@/modules/admin/posts/model';

export const Route = createFileRoute('/_auth/admin/posts')({
  validateSearch: (search) => postsSearchSchema.parse(search),
  staticData: {
    labelKey: 'posts.title',
    permission: 'iam:post:view',
    actions: [
      { key: 'post-create', code: 'iam:post:create', labelKey: 'posts.actions.create' },
      { key: 'post-update', code: 'iam:post:update', labelKey: 'posts.edit' },
      { key: 'post-delete', code: 'iam:post:delete', labelKey: 'posts.delete' },
    ],
  },
  component: PostsRoute,
});

function PostsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();

  return (
    <PostsPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      search={search}
      onSearchChange={(patch) => void navigate({ search: { ...search, ...patch } })}
    />
  );
}
