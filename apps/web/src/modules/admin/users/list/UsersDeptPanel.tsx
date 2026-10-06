import { useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DetailAside, PageSectionHeading } from '@/components/pro/page-scaffold';
import type { FilterRoot } from '@/components/pro/filter-builder';
import { SearchField } from '@/components/pro/SearchField';
import { Tree, type TreeNode } from '@/components/pro/Tree';
import { TableText } from '@/components/pro/TableText';
import { Checkbox } from '@/components/ui/checkbox';
import { CircleMinus } from 'lucide-react';
import { userDeptCountsQuery, userDeptTreeQuery as deptTreeQuery } from '../api/dictionaries';
import {
  deptHeadcounts,
  deptScopeFromFilters,
  deptUnassignedFromFilters,
  userDeptTreeRows,
  withDeptScope,
  withDeptUnassigned,
} from '../model';

const UNASSIGNED_ID = 'unassigned';

export function UsersDeptPanel({
  filters,
  onFiltersChange,
}: {
  filters: FilterRoot;
  onFiltersChange: (next: FilterRoot) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: depts = [] } = useQuery(deptTreeQuery);
  const { data: counts } = useQuery(userDeptCountsQuery);
  const headcounts = counts ? deptHeadcounts(depts, counts.counts) : null;
  const [keyword, setKeyword] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [includeChildren, setIncludeChildren] = useState(true);
  const scope = deptScopeFromFilters(filters);
  const unassigned = deptUnassignedFromFilters(filters);
  const searching = keyword.trim() !== '';

  const nodes: TreeNode[] = userDeptTreeRows(depts, keyword).map((row) => ({
    id: row.id,
    label: row.enabled ? row.name : `${row.name}（${t('users.deptPanel.disabled')}）`,
    depth: row.depth,
    expandable: row.hasChildren,
    expanded: searching || !collapsed.has(row.id),
    toggleLabel: t('users.deptPanel.toggle', { name: row.name }),
    meta: headcounts?.get(row.id),
  }));

  const select = (deptId: string) => {
    const same = scope?.deptId === deptId;
    onFiltersChange(withDeptScope(filters, same ? null : { deptId, includeChildren }));
  };
  const toggleUnassigned = () => onFiltersChange(withDeptUnassigned(filters, !unassigned));
  const changeIncludeChildren = (next: boolean) => {
    setIncludeChildren(next);
    if (scope) onFiltersChange(withDeptScope(filters, { deptId: scope.deptId, includeChildren: next }));
  };

  return (
    <DetailAside
      variant="panel"
      data-slot="users-dept-panel"
      className="flex w-[calc(236px*var(--app-scale))] flex-col gap-[calc(10px*var(--app-scale))] p-[calc(12px*var(--app-scale))]"
    >
      <PageSectionHeading
        title={t('users.deptPanel.title')}
        actions={
          <label className="flex items-center gap-[calc(6px*var(--app-scale))]">
            <Checkbox
              checked={scope ? scope.includeChildren : includeChildren}
              onCheckedChange={changeIncludeChildren}
            />
            <TableText tone="weak">{t('users.deptPanel.includeChildren')}</TableText>
          </label>
        }
      />
      <SearchField
        aria-label={t('users.deptPanel.search')}
        placeholder={t('users.deptPanel.search')}
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Tree
          variant="compact"
          ariaLabel={t('users.deptPanel.treeLabel')}
          nodes={nodes}
          selectedId={scope?.deptId}
          onSelect={select}
          onToggle={(id) =>
            setCollapsed((current) => {
              const next = new Set(current);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          empty={t('users.deptPanel.empty')}
        />
      </div>
      {!searching && (
        <Tree
          variant="compact"
          ariaLabel={t('users.deptPanel.unassigned')}
          nodes={[
            {
              id: UNASSIGNED_ID,
              label: t('users.deptPanel.unassigned'),
              depth: 0,
              leading: <CircleMinus aria-hidden="true" className="size-full" />,
              meta: counts?.unassigned,
            },
          ]}
          selectedId={unassigned ? UNASSIGNED_ID : undefined}
          onSelect={toggleUnassigned}
        />
      )}
    </DetailAside>
  );
}
