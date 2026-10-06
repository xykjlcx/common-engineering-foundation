import { useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilterChips } from '@/components/pro/filter-chips';
import type { FilterRoot } from '@/components/pro/filter-builder';
import { filterSchemesQuery, useFilterSchemeMutations, type UsersQueryParams } from '../api';
import { stringifyFilters } from '../model';
import { SchemeManagerDialog } from './SchemeManagerDialog';
import { useUserFilterFields } from './useUserFilterFields';

export function UsersFilterChips({
  search,
  filters,
  onFiltersChange,
  onOpenAdvanced,
  onApplyScheme,
  onSchemeDeleted,
  onClear,
  onSaveAs,
}: {
  search: UsersQueryParams;
  filters: FilterRoot;
  onFiltersChange: (next: FilterRoot) => void;
  onOpenAdvanced: (focus?: string) => void;
  onApplyScheme: (id: string) => void;
  onSchemeDeleted: (id: string) => void;
  onClear: () => void;
  onSaveAs: () => void;
}): JSX.Element {
  const { fields, panelLabels, chipsLabels } = useUserFilterFields(search);
  const { data: schemes = [] } = useQuery(filterSchemesQuery);
  const { updateScheme } = useFilterSchemeMutations();
  const [managing, setManaging] = useState(false);
  const scheme = schemes.find((item) => item.id === search.schemeId);
  const modified = !!scheme && stringifyFilters(filters) !== scheme.filters;

  return (
    <>
      <FilterChips
        value={filters}
        fields={fields}
        onChange={onFiltersChange}
        onOpenAdvanced={onOpenAdvanced}
        onClear={onClear}
        scheme={scheme ? { id: scheme.id, name: scheme.name, modified } : undefined}
        schemes={schemes.map((item) => ({ id: item.id, name: item.name }))}
        onApplyScheme={onApplyScheme}
        onManageSchemes={() => setManaging(true)}
        onSchemeSave={
          scheme?.editable
            ? () =>
                void updateScheme.mutateAsync({
                  id: scheme.id,
                  dto: { filters: stringifyFilters(filters), version: scheme.version },
                })
            : undefined
        }
        onSchemeSaveAs={onSaveAs}
        panelLabels={panelLabels}
        labels={chipsLabels}
      />
      <SchemeManagerDialog
        open={managing}
        onOpenChange={(next) => setManaging(next)}
        onDeleted={onSchemeDeleted}
      />
    </>
  );
}
