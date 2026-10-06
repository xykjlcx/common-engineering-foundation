import { PostMembers } from './PostMembers';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DetailHeader, PagePane, PagePaneBody } from '@/components/pro/page-scaffold';
import { QueryState } from '@/components/pro/QueryState';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { authzContext, matchPermission } from '@/lib/permission';
import { postDetailQuery, usePostMutations } from '../api';
import { postError } from '../model';

export function PostDetailPanel({
  id,
  permissions,
  systemAdmin,
  onClose,
  onEdit,
  onDelete,
}: {
  id: string;
  permissions: string[];
  systemAdmin?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('admin');
  const query = useQuery(postDetailQuery(id));
  const mutations = usePostMutations();
  const authz = authzContext(permissions, systemAdmin);
  const canUpdate = matchPermission(authz, 'iam:post:update');

  return (
    <PagePane
      variant="detail"
      role="region"
      aria-label={t('posts.detailLabel')}
      className="w-[calc(340px*var(--app-scale))] shrink-0"
    >
      <PagePaneBody className="px-5 py-[calc(18px*var(--app-scale))]">
        <QueryState
          data={query.data}
          pending={query.isPending}
          error={query.isError}
          loadingLabel={t('posts.loading.list')}
          errorLabel={t('posts.loadFailed')}
          retryLabel={t('posts.retry')}
          onRetry={() => void query.refetch()}
        >
          {(post) => (
            <div className="flex flex-col gap-[calc(14px*var(--app-scale))]">
              <div className="flex items-start gap-2">
                <DetailHeader
                  className="flex-1"
                  variant="identity"
                  title={post.name}
                  subtitle={post.code}
                  subtitleMono
                  status={
                    <StatusBadge tone={post.enabled ? 'success' : 'neutral'}>
                      {t(post.enabled ? 'posts.status.enabled' : 'posts.status.disabled')}
                    </StatusBadge>
                  }
                />
                <Button variant="ghost" size="icon-sm" aria-label={t('posts.closeDetail')} onClick={onClose}>
                  <X aria-hidden="true" />
                </Button>
              </div>
              <div className="flex gap-2">
                {canUpdate && (
                  <>
                    <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
                      {t('posts.edit')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      loading={mutations.update.isPending}
                      onClick={() =>
                        mutations.update.mutate({
                          id: post.id,
                          version: post.version,
                          enabled: !post.enabled,
                        })
                      }
                    >
                      {t(post.enabled ? 'posts.disable' : 'posts.enable')}
                    </Button>
                  </>
                )}
                {matchPermission(authz, 'iam:post:delete') && (
                  <Button size="sm" variant="danger-ghost" onClick={onDelete}>
                    {t('posts.delete')}
                  </Button>
                )}
              </div>
              {mutations.update.error && (
                <Alert variant="destructive">
                  <AlertDescription>{postError(mutations.update.error, t)}</AlertDescription>
                </Alert>
              )}
              <Alert variant="warning">
                <AlertDescription>{t('posts.templateHint')}</AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <TableText tone="strong">{t('posts.defaultRoles')}</TableText>
                <div className="flex flex-wrap gap-2">
                  {post.roles.map((role) => (
                    <StatusBadge key={role.id} tone="neutral">
                      {role.name}
                    </StatusBadge>
                  ))}
                  {post.roles.length === 0 && <TableText>{t('posts.noRoles')}</TableText>}
                </div>
              </div>
              {matchPermission(authz, 'iam:user:view') && (
                <>
                  <Separator />
                  <PostMembers key={id} id={id} />
                </>
              )}
              <Separator />
              <div className="flex flex-col gap-2">
                <TableText tone="strong">{t('posts.remark')}</TableText>
                <TableText className="overflow-visible whitespace-pre-wrap break-words">
                  {post.remark || '—'}
                </TableText>
              </div>
            </div>
          )}
        </QueryState>
      </PagePaneBody>
    </PagePane>
  );
}
