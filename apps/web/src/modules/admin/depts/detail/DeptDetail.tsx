import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QueryState } from '@/components/pro/QueryState';
import { PageSection } from '@/components/pro/page-scaffold';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import { departmentDetailQuery, departmentTreeQuery, type Department } from '../api';
import { DeptMemberPreview } from './DeptMemberPreview';
import { deptPathLabel } from '../model';

export function DeptDetail({
  id,
  canEdit,
  canDelete,
  canCreate = false,
  permissions = [],
  systemAdmin = false,
  onEdit,
  onDelete,
  onAdjustParent,
  onAddChild,
  onToggle,
  onMembers,
  onAddMembers,
  onChanges,
}: {
  id: string;
  canEdit: boolean;
  canDelete: boolean;
  canCreate?: boolean;
  permissions?: string[];
  systemAdmin?: boolean;
  onEdit: (row: Department) => void;
  onDelete: (row: Department) => void;
  onAdjustParent?: (row: Department) => void;
  onAddChild?: (kind: 'company' | 'department') => void;
  onToggle?: (row: Department) => void;
  onMembers?: () => void;
  onAddMembers?: () => void;
  onChanges?: () => void;
}) {
  const { t } = useTranslation('admin');
  const query = useQuery(departmentDetailQuery(id));
  const tree = useQuery(departmentTreeQuery);
  const canMembers = matchPermission({ permissions, systemAdmin }, 'iam:user:view');
  const canChanges = matchPermission({ permissions, systemAdmin }, 'audit:log:view');
  return (
    <QueryState
      data={query.data}
      pending={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.isError}
      loadingLabel={t('depts.loading')}
      errorLabel={t('depts.loadFailed')}
      retryLabel={t('depts.retry')}
      onRetry={() => void query.refetch()}
    >
      {(row) => (
        <PageSection
          variant="card"
          title={row.name}
          description={deptPathLabel(tree.data ?? [], id, { skipRoot: false, separator: ' / ' }) || row.name}
          actions={
            <StatusBadge tone={row.effectiveEnabled ? 'success' : 'neutral'}>
              {t(row.effectiveEnabled ? 'depts.fields.enabled' : 'depts.fields.disabled')}
            </StatusBadge>
          }
        >
          <div className="mt-4 grid gap-4">
            <TableText tone="hint" className="whitespace-normal">
              {t(row.kind === 'company' ? 'depts.org.company' : 'depts.org.department')} ·{' '}
              {t('depts.codeSort', { code: row.code ?? '—', sort: row.sort })}
            </TableText>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Button size="sm" onClick={() => onEdit(row)}>
                  {t('depts.actions.edit')}
                </Button>
              )}
              {canCreate && onAddChild && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!row.effectiveEnabled}
                    onClick={() => onAddChild('department')}
                  >
                    {t('depts.org.newDepartment')}
                  </Button>
                  {row.kind === 'company' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!row.effectiveEnabled}
                      onClick={() => onAddChild('company')}
                    >
                      {t('depts.org.newCompany')}
                    </Button>
                  )}
                </>
              )}
              {canEdit && row.parentId && (
                <Button size="sm" variant="outline" onClick={() => onAdjustParent?.(row)}>
                  {t('depts.org.adjustParent')}
                </Button>
              )}
              {canEdit && onToggle && (
                <Button size="sm" variant="ghost" onClick={() => void onToggle(row)}>
                  {t(row.enabled ? 'depts.fields.disabled' : 'depts.fields.enabled')}
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="danger-ghost" onClick={() => onDelete(row)}>
                  {t('depts.actions.delete')}
                </Button>
              )}
            </div>
            {!row.effectiveEnabled && (
              <TableText tone="hint" className="whitespace-normal">
                {t('depts.org.disabledBranch')}
              </TableText>
            )}
            <DescriptionList
              divided
              items={[
                { label: t('depts.org.companyOf'), value: row.companyName ?? t('depts.org.unassigned') },
                {
                  label: t('depts.fields.leader'),
                  value: row.leaderName ?? t(row.leaderId ? 'depts.leaderUnavailable' : 'depts.unset'),
                },
                {
                  label: t('depts.directMembers'),
                  value: t('depts.memberCount', { count: row.memberCount }),
                },
                {
                  label: t('depts.org.subtreeMembers'),
                  value: t('depts.memberCount', { count: row.memberCountWithSub }),
                },
                {
                  label: t('depts.children'),
                  value: tree.data?.filter((child) => child.parentId === row.id).length ?? '—',
                },
                { label: t('depts.headcountLabel'), value: row.headcount ?? t('depts.noHeadcount') },
              ]}
            />
            <TableText tone="hint" className="whitespace-normal">
              {t('depts.org.directHint')}
            </TableText>
            {canMembers && <DeptMemberPreview key={id} id={id} />}
            {canMembers && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={onMembers}>
                  {t('depts.org.membersTitle')} · {row.memberCount}
                </Button>
                {onAddMembers && (
                  <Button variant="outline" disabled={!row.effectiveEnabled} onClick={onAddMembers}>
                    {t('depts.org.addMembers')}
                  </Button>
                )}
              </div>
            )}
            {canChanges && (
              <Button variant="link" onClick={onChanges}>
                {t('depts.changes')}
              </Button>
            )}
          </div>
        </PageSection>
      )}
    </QueryState>
  );
}
