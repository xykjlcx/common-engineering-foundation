import { useCallback, useState, type JSX } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { chipCount, type FilterRoot } from '@/components/pro/filter-builder';
import { FilterChips } from '@/components/pro/filter-chips';
import { FullscreenSurface } from '@/components/pro/FullscreenSurface';
import { ListChrome, ListPageHeader } from '@/components/pro/ListChrome';
import { PagePane } from '@/components/pro/page-scaffold';
import { PermissionAction } from '@/components/pro/PermissionAction';
import { useLastSuccessfulData } from '@/components/pro/use-last-successful-data';
import { Button } from '@/components/ui/button';
import { BizError } from '@/lib/http/errors';
import { authzContext, matchPermission } from '@/lib/permission';
import { useColumnPreferences } from '@/components/pro/use-column-preferences';
import { postsQuery, postKeys, type PostsQueryParams } from '../api';
import { PostDialogForm } from '../form/PostDialogForm';
import { PostDeleteDialog } from '../detail/PostDeleteDialog';
import { PostDetailPanel } from '../detail/PostDetailPanel';
import type { PostDialog } from '../types';
import { postFilterFields, postOperatorLabels, parseFilters, stringifyFilters } from '../model';
import type { PostsSearch } from '../types';
import { postColumns } from './columns';
import { PostsToolbar } from './PostsToolbar';

const emptyPage = { list: [], total: 0 };

export function PostsScene({
  permissions,
  systemAdmin = false,
  search,
  onSearchChange,
}: {
  permissions: string[];
  systemAdmin?: boolean;
  search: PostsSearch;
  onSearchChange: (patch: Partial<PostsQueryParams>) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const queryClient = useQueryClient();
  const authz = authzContext(permissions, systemAdmin);
  const postsResult = useQuery(postsQuery(search));
  const [fullscreen, setFullscreen] = useState(false);
  const [dialog, setDialog] = useState<PostDialog | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const changeSearch = useCallback(
    (patch: Partial<PostsQueryParams>) => {
      onSearchChange(patch);
    },
    [onSearchChange],
  );

  const postsPage = useLastSuccessfulData(postsResult.data) ?? emptyPage;
  const pageCount = Math.max(1, Math.ceil(postsPage.total / search.pageSize));
  const filters = parseFilters(search.filters);
  const filterCount = chipCount(filters);
  const hasQuery = filterCount > 0 || search.keyword !== '';

  const totalLabel = hasQuery
    ? t('posts.pagination.filteredTotal', { count: postsPage.total })
    : t('posts.count', { count: postsPage.total });

  const columns = postColumns(t, (id) => setDetailId(id));

  const { prefs, setPrefs, resetPrefs, columnState, columnItems, setColumns } = useColumnPreferences(
    'admin.posts',
    columns,
    { density: 'default' },
  );

  const applyFilters = (next: FilterRoot) => {
    changeSearch({ filters: stringifyFilters(next) || undefined, page: 1 });
  };

  const filterFields = postFilterFields((key) => t(`posts.filters.${key}`));
  const operatorLabels = postOperatorLabels((key) => t(`posts.filters.${key}`));

  const panelLabels = {
    searchPlaceholder: tc('list.filters.optionSearch'),
    includeSub: tc('list.filters.includeSub'),
    commitHint: tc('list.filters.commitHint'),
    quickRanges: [],
    rangeFrom: t('posts.filters.rangeFrom'),
    rangeTo: t('posts.filters.rangeTo'),
    textOps: {
      contains: tc('list.filters.textOps.contains'),
      eq: t('posts.filters.textOps.eq'),
      isEmpty: tc('list.filters.textOps.isEmpty'),
    },
    enterHint: tc('list.filters.enterHint'),
    clearText: t('posts.filters.clearText'),
    empty: tc('list.filters.noMatch'),
  };

  const chipsLabels = {
    advanced: t('posts.filters.advanced'),
    clear: t('posts.filters.clear'),
    modified: tc('list.filters.modified'),
    save: tc('list.filters.save'),
    saveAs: tc('list.filters.saveAs'),
    more: (count: number) => tc('list.filters.more', { count }),
    collapse: tc('list.filters.collapse'),
    removeCondition: (label: string) => `${t('posts.filters.removeCondition')} ${label}`,
    schemesTitle: t('posts.filters.schemesTitle'),
    manageSchemes: tc('list.filters.manageSchemes'),
    includeSub: tc('list.filters.includeSub'),
    operators: operatorLabels,
  };

  const canCreate = matchPermission(authz, 'iam:post:create');
  const error = postsResult.error;

  const errorMessage =
    error instanceof BizError ? error.detail : error instanceof Error ? error.message : t('posts.loadFailed');

  const traceId = error instanceof BizError ? (error.traceId ?? undefined) : undefined;

  const listBody = (
    <>
      <div className="px-[calc(20px*var(--app-scale))] pt-[calc(12px*var(--app-scale))]">
        <ListPageHeader
          title={t('posts.title')}
          count={totalLabel}
          actions={
            <PermissionAction allowed={canCreate} degrade="hide" reason={t('posts.permission.noCreate')}>
              <Button type="button" variant="primary" onClick={() => setDialog({ kind: 'create' })}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                {t('posts.actions.create')}
              </Button>
            </PermissionAction>
          }
        />
      </div>
      <ListChrome
        toolbar={
          <PostsToolbar
            search={search}
            onSearchChange={changeSearch}
            filters={filters}
            onFiltersChange={applyFilters}
            columnItems={columnItems}
            onColumnsChange={setColumns}
            density={prefs.density}
            onDensityChange={(density) => setPrefs({ density })}
            onResetColumns={resetPrefs}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: postKeys.all })}
            refreshing={postsResult.isFetching && !postsResult.isPending}
            fullscreen={{ active: fullscreen, onToggle: () => setFullscreen((open) => !open) }}
          />
        }
        filters={
          filterCount > 0 ? (
            <FilterChips
              value={filters}
              fields={filterFields}
              onChange={applyFilters}
              onClear={() => applyFilters({ op: 'and', items: [] })}
              panelLabels={panelLabels}
              labels={chipsLabels}
            />
          ) : undefined
        }
      />
      <DataTable
        columns={columns}
        data={postsPage.list}
        rowKey={(post) => post.id}
        rowState={(post) => (post.id === detailId ? 'selected' : undefined)}
        onRowClick={(post) => setDetailId(post.id)}
        loading={postsResult.isPending}
        error={postsResult.isError}
        errorText={t('posts.loadFailed')}
        retryText={t('posts.retry')}
        onRetry={() => void postsResult.refetch()}
        emptyText={t('posts.emptyText')}
        loadingText={t('posts.loading.list')}
        columnState={columnState}
        onColumnStateChange={setPrefs}
        density={prefs.density}
        skeletonRows={search.pageSize}
        busy={postsResult.isFetching && !postsResult.isPending}
        busyLabel={t('posts.loading.plain')}
        errorBanner={
          postsResult.isError && postsPage.list.length > 0
            ? {
                message: t('posts.error.banner', { message: errorMessage }),
                traceId,
                retryLabel: t('posts.retry'),
                copyLabel: t('posts.error.copyTrace'),
                onRetry: () => void postsResult.refetch(),
              }
            : undefined
        }
        pagination={{
          page: search.page,
          pageCount,
          total: postsPage.total,
          refreshing: postsResult.isFetching && !postsResult.isPending,
          totalLabel,
          refreshingLabel: t('posts.refreshing'),
          prevLabel: t('posts.pagination.prev'),
          nextLabel: t('posts.pagination.next'),
          currentLabel: t('posts.pagination.current', { page: search.page }),
          onPageChange: (page) => changeSearch({ page }),
          pageSize: {
            value: search.pageSize,
            options: [15, 30, 50, 100],
            label: (size) => t('posts.pagination.pageSize', { size }),
            ariaLabel: t('posts.pagination.pageSizeLabel'),
            onChange: (size) => changeSearch({ pageSize: size, page: 1 }),
          },
        }}
      />
    </>
  );

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1">
        <PagePane variant="master" className="flex-1">
          {fullscreen ? (
            <FullscreenSurface
              title={t('posts.title')}
              subtitle={totalLabel}
              escHint={tc('table.escToExit')}
              exitLabel={tc('table.exitFullscreen')}
              onExit={() => setFullscreen(false)}
            >
              {listBody}
            </FullscreenSurface>
          ) : (
            listBody
          )}
        </PagePane>
        {detailId && (
          <PostDetailPanel
            id={detailId}
            permissions={permissions}
            systemAdmin={systemAdmin}
            onClose={() => setDetailId(null)}
            onEdit={() => setDialog({ kind: 'edit', id: detailId })}
            onDelete={() => {
              setDialog({ kind: 'delete', id: detailId });
              setDetailId(null);
            }}
          />
        )}
      </div>
      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <PostDialogForm id={dialog.kind === 'edit' ? dialog.id : undefined} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && <PostDeleteDialog id={dialog.id} onClose={() => setDialog(null)} />}
    </>
  );
}
