import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnSettings, type ColumnSettingsItem } from '@/components/pro/ColumnSettings';
import { ToolbarIconActions, type ToolbarFullscreenState } from '@/components/pro/DataToolbar';
import type { FilterRoot } from '@/components/pro/filter-builder';
import { FilterMenu } from '@/components/pro/filter-menu/FilterMenu';
import { chipCount } from '@/components/pro/filter-builder';
import { ListToolbar } from '@/components/pro/ListChrome';
import { SearchField } from '@/components/pro/SearchField';
import type { TableDensity } from '@/components/pro/table-density';
import type { PostsQueryParams } from '../api';
import { postFilterFields, postOperatorLabels } from '../model';
import type { PostsSearch } from '../types';
import { useSearchDraft } from '@/lib/use-search-draft';
import { columnSettingsLabels } from '@/lib/list-labels';

export function PostsToolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  columnItems,
  onColumnsChange,
  density,
  onDensityChange,
  onResetColumns,
  onRefresh,
  refreshing,
  fullscreen,
  trailing,
}: {
  search: PostsSearch;
  onSearchChange: (patch: Partial<PostsQueryParams>) => void;
  filters: FilterRoot;
  onFiltersChange: (next: FilterRoot) => void;
  columnItems: ColumnSettingsItem[];
  onColumnsChange: (next: ColumnSettingsItem[]) => void;
  density: TableDensity;
  onDensityChange: (density: TableDensity) => void;
  onResetColumns: () => void;
  onRefresh?: () => void | Promise<unknown>;
  refreshing?: boolean;
  fullscreen?: ToolbarFullscreenState;
  trailing?: ReactNode;
}): JSX.Element {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const fields = postFilterFields((key) => t(`posts.filters.${key}`));
  const [draft, setDraft] = useSearchDraft(search.keyword, (next) =>
    onSearchChange({ keyword: next, page: 1 }),
  );

  return (
    <ListToolbar
      leading={
        <>
          <SearchField
            aria-label={t('posts.searchLabel')}
            placeholder={t('posts.searchPlaceholder')}
            value={draft}
            containerClassName="w-[calc(232px*var(--app-scale))]"
            onChange={(event) => setDraft(event.target.value)}
          />
          <FilterMenu
            fields={fields}
            value={filters}
            onChange={onFiltersChange}
            operatorLabels={postOperatorLabels((key) => t(`posts.filters.${key}`))}
            labels={{
              trigger: t('posts.filters.label'),
              searchPlaceholder: t('posts.filters.menuSearch'),
              schemesTitle: t('posts.filters.schemesTitle'),
              fieldsTitle: t('posts.filters.fieldsTitle'),
              advanced: t('posts.filters.advanced'),
              conditionCount: (count) => t('posts.filters.conditionCount', { count }),
              commitHint: tc('list.filters.commitHint'),
            }}
            panelLabels={{
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
            }}
            activeCount={chipCount(filters)}
          />
          <ToolbarIconActions
            onRefresh={onRefresh}
            refreshing={refreshing}
            fullscreen={fullscreen}
            labels={{
              refresh: tc('table.refresh'),
              fullscreen: tc('table.fullscreen'),
              exitFullscreen: tc('table.exitFullscreen'),
            }}
          >
            <ColumnSettings
              density={density}
              onDensityChange={onDensityChange}
              columns={columnItems}
              onColumnsChange={onColumnsChange}
              onReset={onResetColumns}
              labels={columnSettingsLabels(tc)}
            />
          </ToolbarIconActions>
        </>
      }
      trailing={trailing}
    />
  );
}
