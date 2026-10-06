import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { authzContext, matchPermission } from '@/lib/permission';
import { useSearchDraft } from '@/lib/use-search-draft';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, CircleAlert, Info } from 'lucide-react';
import { InboxNavigation, InboxList } from '@/components/pro/Inbox';
import { Pagination } from '@/components/pro/Pagination';
import { markdownToPlainText } from '@/lib/markdown';
import { SearchField } from '@/components/pro/SearchField';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { PagePane, PagePaneToolbar } from '@/components/pro/page-scaffold';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLabel, FieldError } from '@/components/ui/field';
import { messagesQuery, unreadQuery, useMessageMutations } from '../api';
import { messageListParams } from '../model';
import { MessageDetail } from '../detail/MessageDetail';
import { MessagePreferencesDialog } from '../form/MessagePreferencesDialog';
import type { MessagesPageProps } from '../types';

export function MessagesScene({ search, onSearchChange, permissions, systemAdmin }: MessagesPageProps) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [searchDraft, changeSearchDraft] = useSearchDraft(search.keyword, (keyword) =>
    onSearchChange({ keyword, page: 1 }),
  );
  const result = useQuery(messagesQuery(messageListParams(search)));
  const counts = useQuery(unreadQuery);
  const mutations = useMessageMutations();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState(false);
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <PagePane variant="navigation" className="w-[calc(235px*var(--app-scale))] shrink-0">
        <InboxNavigation
          title={t('messages.title')}
          activeId={search.category}
          items={[
            { id: 'all', label: t('messages.categories.all'), count: counts.data?.count },
            { id: 'system', label: t('messages.categories.system'), count: counts.data?.system },
            {
              id: 'announcement',
              label: t('messages.categories.announcement'),
              count: counts.data?.announcement,
            },
            { id: 'archived', label: t('messages.categories.archived') },
          ]}
          onSelect={(category) => {
            if (
              category === 'all' ||
              category === 'system' ||
              category === 'announcement' ||
              category === 'archived'
            ) {
              onSearchChange({ category, page: 1 });
              setDetailId(null);
            }
          }}
          footer={
            <>
              {matchPermission(authzContext(permissions, systemAdmin), 'iam:notice:view') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void navigate({
                      to: '/admin/notices',
                      search: { keyword: '', status: 'all', page: 1, pageSize: 20 },
                    })
                  }
                >
                  {t('messages.manageNotices')}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setPreferences(true)}>
                {t('messages.preferences')}
              </Button>
            </>
          }
        />
      </PagePane>
      <PagePane variant="master" className="w-[calc(431px*var(--app-scale))] shrink-0">
        <PagePaneToolbar>
          <div className="flex items-center gap-2">
            <SearchField
              containerClassName="min-w-0 flex-1"
              aria-label={t('messages.search')}
              placeholder={t('messages.search')}
              value={searchDraft}
              onChange={(event) => changeSearchDraft(event.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              loading={mutations.readAll.isPending}
              onClick={() => mutations.readAll.mutate()}
            >
              {t('messages.readAll')}
            </Button>
            <FieldLabel className="flex shrink-0 items-center gap-1 text-xs">
              <Checkbox
                aria-label={t('messages.unreadOnly')}
                title={t('messages.unreadOnly')}
                checked={search.unreadOnly}
                onCheckedChange={(checked) => onSearchChange({ unreadOnly: checked === true, page: 1 })}
              />
              <span>{t('messages.unreadOnly')}</span>
            </FieldLabel>
          </div>
          <FieldError>{mutations.readAll.isError ? t('messages.actionFailed') : null}</FieldError>
        </PagePaneToolbar>
        <InboxList
          label={t('messages.title')}
          activeId={detailId}
          items={(result.data?.list ?? []).map((message) => ({
            id: message.id,
            title: message.title,
            description: markdownToPlainText(message.content),
            time: new Intl.DateTimeFormat(
              undefined,
              new Date(message.createdAt).toDateString() === new Date().toDateString()
                ? { hour: '2-digit', minute: '2-digit', hour12: false }
                : { month: '2-digit', day: '2-digit' },
            ).format(new Date(message.createdAt)),
            unread: !message.readAt,
            tone:
              message.severity === 'urgent'
                ? 'danger'
                : message.severity === 'important'
                  ? 'warning'
                  : message.kind === 'system'
                    ? 'info'
                    : 'neutral',
            icon:
              message.severity === 'normal' ? (
                message.kind === 'announcement' ? (
                  <Bell />
                ) : (
                  <Info />
                )
              ) : (
                <CircleAlert />
              ),
            meta: message.pinned ? (
              <StatusBadge showDot={false} tone="warning">
                {t('messages.pinned')}
              </StatusBadge>
            ) : undefined,
          }))}
          onSelect={(id) => setDetailId(id)}
          loading={result.isPending}
          error={result.isError}
          errorLabel={t('messages.loadFailed')}
          onRetry={() => void result.refetch()}
          retryLabel={t('messages.retry')}
          emptyLabel={t('messages.empty')}
        />
        <Pagination
          page={search.page}
          pageCount={Math.max(1, Math.ceil((result.data?.total ?? 0) / search.pageSize))}
          totalLabel={t('messages.total', { count: result.data?.total ?? 0 })}
          prevLabel={t('messages.prev')}
          nextLabel={t('messages.next')}
          currentLabel={t('messages.page', { page: search.page })}
          onPageChange={(page) => onSearchChange({ page })}
        />
      </PagePane>
      <PagePane variant="detail" className="min-w-0 flex-1">
        {detailId ? (
          <MessageDetail key={detailId} id={detailId} />
        ) : (
          <div className="m-auto p-6">
            <TableText tone="weak">{t('messages.selectMessage')}</TableText>
          </div>
        )}
      </PagePane>
      {preferences && <MessagePreferencesDialog onClose={() => setPreferences(false)} />}
    </div>
  );
}
