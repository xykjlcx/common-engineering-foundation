import type { JSX, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ColumnSettings, type ColumnSettingsItem } from '@/components/pro/ColumnSettings';
import { ToolbarIconActions, type ToolbarFullscreenState } from '@/components/pro/DataToolbar';
import { FilterMenu } from '@/components/pro/filter-menu/FilterMenu';
import { chipCount, type FilterRoot } from '@/components/pro/filter-builder';
import { ListToolbar } from '@/components/pro/ListChrome';
import { SearchField } from '@/components/pro/SearchField';
import type { TableDensity } from '@/components/pro/table-density';
import { useSearchDraft } from '@/lib/use-search-draft';
import { filterSchemesQuery, type UsersQueryParams } from '../api';
import { parseFilters } from '../model';
import type { UsersSearch } from '../types';
import { useUserFilterFields } from './useUserFilterFields';

export function UsersToolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onOpenAdvanced,
  onApplyScheme,
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
  search: UsersSearch;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
  filters: FilterRoot;
  onFiltersChange: (next: FilterRoot) => void;
  onOpenAdvanced: (focus?: string) => void;
  onApplyScheme: (id: string) => void;
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
  // 刷新 / 全屏是通用表格动作，文案住 common namespace（pro 组件自己不做 i18n，只吃 labels）
  const { t: tCommon } = useTranslation('common');
  const { fields, operatorLabels, panelLabels, menuLabels } = useUserFilterFields(search);
  const { data: schemes = [] } = useQuery(filterSchemesQuery);
  const [draft, setDraft] = useSearchDraft(search.keyword, (next) =>
    onSearchChange({ keyword: next, page: 1 }),
  );

  return (
    <ListToolbar
      leading={
        <>
          <SearchField
            aria-label={t('users.searchLabel')}
            placeholder={t('users.searchPlaceholder')}
            value={draft}
            containerClassName="w-[calc(232px*var(--app-scale))]"
            onChange={(event) => setDraft(event.target.value)}
          />
          <FilterMenu
            fields={fields}
            value={filters}
            onChange={onFiltersChange}
            schemes={schemes.map((scheme) => ({
              id: scheme.id,
              name: scheme.name,
              conditionCount: chipCount(parseFilters(scheme.filters)),
              scope: scheme.scope,
            }))}
            activeSchemeId={search.schemeId}
            onApplyScheme={onApplyScheme}
            onOpenAdvanced={onOpenAdvanced}
            operatorLabels={operatorLabels}
            labels={menuLabels}
            panelLabels={panelLabels}
            activeCount={chipCount(filters)}
          />
          {/* 板 DSAdditions 4.9：刷新在「密度 / 列设置」左侧、全屏在最右，四个控件同组、间距 2 */}
          <ToolbarIconActions
            onRefresh={onRefresh}
            refreshing={refreshing}
            fullscreen={fullscreen}
            labels={{
              refresh: tCommon('table.refresh'),
              fullscreen: tCommon('table.fullscreen'),
              exitFullscreen: tCommon('table.exitFullscreen'),
            }}
          >
            <ColumnSettings
              density={density}
              onDensityChange={onDensityChange}
              columns={columnItems}
              onColumnsChange={onColumnsChange}
              onReset={onResetColumns}
              labels={{
                trigger: t('users.columns.label'),
                densityTitle: t('users.columns.density'),
                densities: {
                  default: t('users.columns.densities.default'),
                  relaxed: t('users.columns.densities.relaxed'),
                  loose: t('users.columns.densities.loose'),
                },
                columnsTitle: t('users.columns.title'),
                summary: (shown, total) => t('users.columns.summary', { shown, total }),
                dragHint: t('users.columns.dragHint'),
                reset: t('users.columns.reset'),
                persistHint: t('users.columns.persistHint'),
              }}
            />
          </ToolbarIconActions>
        </>
      }
      trailing={trailing}
    />
  );
}
