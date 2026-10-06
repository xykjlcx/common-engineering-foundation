import { useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import { DataTable } from '@/components/pro/DataTable';
import { ListPageHeader } from '@/components/pro/ListChrome';
import { SearchField } from '@/components/pro/SearchField';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { StatusTabs } from '@/components/pro/StatusTabs';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { NoticeTableLayout } from '@/components/pro/NoticeEditorChrome';
import { PagePane } from '@/components/pro/page-scaffold';
import { Button } from '@/components/ui/button';
import { useSearchDraft } from '@/lib/use-search-draft';
import { authzContext, matchPermission } from '@/lib/permission';
import { noticesQuery, noticeAudienceOptionsQuery, type NoticeDto } from '../api';
import { noticeListParams, noticeStatusTone, noticeTime } from '../model';
import { NoticeReadingRate } from '../components/NoticeReadingRate';
import { NoticeEditor } from '../detail/NoticeEditor';
import type { NoticesPageProps } from '../types';

export function NoticesScene({ search, onSearchChange, permissions, systemAdmin }: NoticesPageProps) {
  const { t } = useTranslation('admin');
  const [searchDraft, changeSearchDraft] = useSearchDraft(search.keyword, (keyword) =>
    onSearchChange({ keyword, page: 1 }),
  );
  const result = useQuery(noticesQuery(noticeListParams(search)));
  const statuses = ['all', 'published', 'scheduled', 'draft', 'withdrawn'] as const;
  const counts = useQueries({
    queries: statuses.map((status) =>
      noticesQuery({
        keyword: search.keyword || undefined,
        status: status === 'all' ? undefined : status,
        page: 1,
        pageSize: 1,
      }),
    ),
  });
  const audienceOptions = useQuery(noticeAudienceOptionsQuery);
  const [searchOpen, setSearchOpen] = useState(search.keyword !== '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{ id: string | null } | null>(null);
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => dirty && current.pathname !== next.pathname,
    enableBeforeUnload: dirty,
    withResolver: true,
  });
  const authz = authzContext(permissions, systemAdmin);
  const select = (id: string | null) => {
    if (id === selectedId) return;
    if (dirty) {
      setPendingSelection({ id });
      return;
    }
    setSelectedId(id);
  };
  const columns: ColumnDef<NoticeDto>[] = [
    {
      id: 'title',
      size: 300,
      header: t('notices.fields.title'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.pinned && (
            <StatusBadge tone="warning" showDot={false}>
              {t('messages.pinned')}
            </StatusBadge>
          )}
          <TableText tone="strong">{row.original.title}</TableText>
        </div>
      ),
    },
    {
      id: 'severity',
      size: 80,
      header: t('notices.fields.severity'),
      cell: ({ row }) => (
        <StatusBadge
          showDot={false}
          tone={
            row.original.severity === 'urgent'
              ? 'danger'
              : row.original.severity === 'important'
                ? 'warning'
                : 'neutral'
          }
        >
          {t(`notices.severity.${row.original.severity}`)}
        </StatusBadge>
      ),
    },
    {
      id: 'audience',
      size: 110,
      header: t('notices.fields.audience'),
      cell: ({ row }) => {
        const source =
          row.original.audience === 'departments'
            ? audienceOptions.data?.departments
            : audienceOptions.data?.roles;
        const label =
          row.original.audience === 'all'
            ? t('notices.audience.all')
            : row.original.audienceIds
                .map((id) => source?.find((item) => item.id === id)?.name ?? t('notices.unavailableTarget'))
                .join('、');
        return <TableText title={label}>{label}</TableText>;
      },
    },
    {
      id: 'reading',
      size: 130,
      header: t('notices.fields.reading'),
      cell: ({ row }) => <NoticeReadingRate {...row.original} />,
    },
    {
      id: 'publishedAt',
      size: 130,
      header: t('notices.fields.publishedAt'),
      cell: ({ row }) => (
        <TableText tone="hint" mono>
          {noticeTime(row.original.publishedAt ?? row.original.scheduledAt)}
        </TableText>
      ),
    },
    {
      id: 'status',
      size: 70,
      header: t('notices.fields.status'),
      cell: ({ row }) => (
        <StatusBadge showDot={false} tone={noticeStatusTone(row.original.status)}>
          {t(`notices.status.${row.original.status}`)}
        </StatusBadge>
      ),
    },
  ];
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <PagePane variant="master" className="flex-1">
        <div className="px-5 pt-3">
          <ListPageHeader
            title={t('notices.title')}
            actions={
              matchPermission(authz, 'iam:notice:create') && (
                <Button onClick={() => select('new')}>
                  <Plus aria-hidden="true" data-icon="inline-start" />
                  {t('notices.create')}
                </Button>
              )
            }
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-5 py-[calc(10px*var(--app-scale))]">
          <StatusTabs
            aria-label={t('notices.fields.status')}
            value={search.status}
            items={statuses.map((value, index) => ({
              value,
              label: t(`notices.status.${value}`),
              count: counts[index]?.data?.total,
            }))}
            onValueChange={(status) => onSearchChange({ status, page: 1 })}
          />
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('notices.search')}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('notices.refresh')}
            onClick={() => {
              void result.refetch();
              for (const count of counts) void count.refetch();
            }}
            loading={result.isFetching}
          >
            <RefreshCw aria-hidden="true" />
          </Button>
        </div>
        {(searchOpen || search.keyword !== '') && (
          <div className="flex items-center gap-2 px-5 pb-3">
            <SearchField
              containerClassName="min-w-0 flex-1"
              aria-label={t('notices.search')}
              placeholder={t('notices.search')}
              value={searchDraft}
              onChange={(event) => changeSearchDraft(event.target.value)}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('notices.closeSearch')}
              onClick={() => {
                changeSearchDraft('');
                onSearchChange({ keyword: '', page: 1 });
                setSearchOpen(false);
              }}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        )}
        <NoticeTableLayout>
          <DataTable
            columns={columns}
            data={result.data?.list ?? []}
            rowKey={(row) => row.id}
            rowState={(row) => (row.id === selectedId ? 'selected' : undefined)}
            onRowClick={(row) => select(row.id)}
            loading={result.isPending}
            error={result.isError}
            errorText={t('notices.loadFailed')}
            retryText={t('messages.retry')}
            onRetry={() => void result.refetch()}
            emptyText={t('notices.empty')}
            loadingText={t('messages.loading')}
            pagination={{
              page: search.page,
              pageCount: Math.max(1, Math.ceil((result.data?.total ?? 0) / search.pageSize)),
              total: result.data?.total ?? 0,
              totalLabel: t('messages.total', { count: result.data?.total ?? 0 }),
              prevLabel: t('messages.prev'),
              nextLabel: t('messages.next'),
              currentLabel: t('messages.page', { page: search.page }),
              onPageChange: (page) => onSearchChange({ page }),
            }}
          />
        </NoticeTableLayout>
      </PagePane>
      {selectedId && (
        <PagePane variant="detail" className="w-[calc(460px*var(--app-scale))] shrink-0">
          <NoticeEditor
            key={selectedId}
            id={selectedId === 'new' ? undefined : selectedId}
            permissions={permissions}
            systemAdmin={systemAdmin}
            onDirtyChange={(value) => setDirty(value)}
            onClose={() => select(null)}
            onCreated={(id) => {
              setDirty(false);
              setSelectedId(id);
            }}
            onDeleted={() => {
              setDirty(false);
              setSelectedId(null);
            }}
          />
        </PagePane>
      )}
      <ConfirmDialog
        open={blocker.status === 'blocked'}
        title={t('notices.discardTitle')}
        description={t('notices.discardDescription')}
        cancelText={t('notices.cancel')}
        confirmText={t('notices.discard')}
        severity="reversible"
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        onConfirm={() => blocker.proceed?.()}
      />
      <ConfirmDialog
        open={pendingSelection !== null}
        title={t('notices.discardTitle')}
        description={t('notices.discardDescription')}
        cancelText={t('notices.cancel')}
        confirmText={t('notices.discard')}
        severity="reversible"
        onOpenChange={(open) => !open && setPendingSelection(null)}
        onConfirm={() => {
          setSelectedId(pendingSelection?.id ?? null);
          setDirty(false);
          setPendingSelection(null);
        }}
      />
    </div>
  );
}
