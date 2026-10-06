import { useTranslation } from 'react-i18next';
import { Building2, Folder } from 'lucide-react';
import { OrganizationChart } from '@/components/pro/OrganizationChart';
import type { Department } from '../api';
import { departmentTreeRows } from '../model';

export function DeptTree({
  rows,
  keyword,
  selectedId,
  onSelect,
  companyId = '',
  typeFilter = 'all',
}: {
  rows: Department[];
  keyword: string;
  selectedId: string;
  onSelect: (id: string) => void;
  companyId?: string;
  typeFilter?: 'all' | 'company' | 'department';
}) {
  const { t } = useTranslation('admin');
  const scope = new Set(companyId ? [companyId] : rows.map((row) => row.id));
  if (companyId) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows)
        if (row.parentId && scope.has(row.parentId) && !scope.has(row.id)) {
          scope.add(row.id);
          changed = true;
        }
    }
  }
  const scoped = rows.filter((row) => scope.has(row.id));
  const visible = new Set(
    scoped.filter((row) => typeFilter === 'all' || row.kind === typeFilter).map((row) => row.id),
  );
  for (const row of scoped)
    if (visible.has(row.id)) {
      let parent = row.parentId;
      while (parent && scope.has(parent) && !visible.has(parent)) {
        visible.add(parent);
        parent = scoped.find((node) => node.id === parent)?.parentId ?? null;
      }
    }
  const nodes = departmentTreeRows(
    scoped.filter((row) => visible.has(row.id)),
    keyword,
  ).map(({ row }) => ({
    id: row.id,
    parentId: row.parentId,
    label: row.name,
    description: t(row.kind === 'company' ? 'depts.org.company' : 'depts.org.department'),
    meta: t('depts.org.nodeMeta', { count: row.memberCountWithSub }),
    unavailable: !row.effectiveEnabled,
    leading: row.kind === 'company' ? <Building2 className="size-4" /> : <Folder className="size-4" />,
  }));
  return (
    <OrganizationChart
      nodes={nodes}
      selectedId={selectedId}
      onSelect={onSelect}
      scopeKey={`${keyword}-${companyId}-${typeFilter}`}
      labels={{
        tree: t('depts.org.chart'),
        empty: t('depts.org.noMatch'),
        hint: t('depts.org.chartHint'),
        zoomIn: t('depts.org.zoomIn'),
        zoomOut: t('depts.org.zoomOut'),
        reset: t('depts.org.reset'),
        expand: (name) => t('depts.org.expand', { name }),
        collapse: (name) => t('depts.org.collapse', { name }),
      }}
    />
  );
}
