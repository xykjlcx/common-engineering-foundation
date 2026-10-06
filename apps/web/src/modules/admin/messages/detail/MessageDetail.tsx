import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BizError } from '@/lib/http/errors';
import { QueryState } from '@/components/pro/QueryState';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { InboxDetailHeading } from '@/components/pro/Inbox';
import { MarkdownContent } from '@/components/pro/MarkdownContent';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { messageDetailQuery, useMessageMutations } from '../api';
import { canArchiveMessage } from '../model';
export function MessageDetail({ id }: { id: string }) {
  const { t } = useTranslation('admin');
  const query = useQuery(messageDetailQuery(id));
  const mutations = useMessageMutations();
  const readAttempted = useRef(false);
  const { mutate: markRead } = mutations.read;
  useEffect(() => {
    if (query.data && !readAttempted.current) {
      readAttempted.current = true;
      if (!query.data.readAt) markRead({ id, read: true });
    }
  }, [id, query.data, markRead]);
  return (
    <QueryState
      data={query.error instanceof BizError && query.error.status === 404 ? undefined : query.data}
      pending={query.isPending}
      error={query.isError}
      loadingLabel={t('messages.loading')}
      errorLabel={t('messages.loadFailed')}
      retryLabel={t('messages.retry')}
      onRetry={() => void query.refetch()}
      className="min-h-0 overflow-auto"
    >
      {(message) => (
        <>
          <InboxDetailHeading
            title={message.title}
            meta={`${new Date(message.createdAt).toLocaleString()} · ${t('messages.from', { name: message.senderName })}`}
            kind={
              <StatusBadge
                showDot={false}
                tone={
                  message.severity === 'urgent'
                    ? 'danger'
                    : message.severity === 'important'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {t(`messages.categories.${message.kind}`)}
              </StatusBadge>
            }
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  loading={mutations.read.isPending}
                  onClick={() => mutations.read.mutate({ id, read: !message.readAt })}
                >
                  {t(message.readAt ? 'messages.markUnread' : 'messages.markRead')}
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={!message.archivedAt && !canArchiveMessage(message)}
                  loading={mutations.archive.isPending}
                  onClick={() => mutations.archive.mutate({ id, archived: !message.archivedAt })}
                >
                  {t(message.archivedAt ? 'messages.restore' : 'messages.archive')}
                </Button>
              </div>
            }
          >
            <MarkdownContent content={message.content} />
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {message.requireConfirmation && (
                <Button
                  size="sm"
                  disabled={!!message.confirmedAt}
                  loading={mutations.confirm.isPending}
                  onClick={() => mutations.confirm.mutate({ id })}
                >
                  {t(message.confirmedAt ? 'messages.confirmed' : 'messages.confirm')}
                </Button>
              )}
            </div>
            <FieldError>
              {mutations.read.isError || mutations.archive.isError || mutations.confirm.isError
                ? t('messages.actionFailed')
                : null}
            </FieldError>
            {message.requireConfirmation && !message.confirmedAt && (
              <TableText tone="weak">{t('messages.confirmBeforeArchive')}</TableText>
            )}
          </InboxDetailHeading>
        </>
      )}
    </QueryState>
  );
}
