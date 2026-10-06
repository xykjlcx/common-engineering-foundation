import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QueryState } from '@/components/pro/QueryState';
import { TableText } from '@/components/pro/TableText';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { usersQuery } from '@/modules/admin/users/api';
import { displayStatus, statusTone } from '@/modules/admin/users/model';
export function DeptMemberPreview({ id }: { id: string }) {
  const { t } = useTranslation('admin');
  const filters = JSON.stringify({
    op: 'and',
    items: [{ id: 'node-preview', field: 'deptId', operator: 'eq', value: id, scope: 'exact' }],
  });
  const query = useQuery(usersQuery({ page: 1, pageSize: 3, filters }));
  return (
    <QueryState
      data={query.data}
      pending={query.isPending}
      error={query.isError}
      loadingLabel={t('depts.members')}
      errorLabel={t('depts.membersFailed')}
      retryLabel={t('depts.retry')}
      onRetry={() => void query.refetch()}
    >
      {(data) => (
        <div className="grid gap-2">
          {data.list.length ? (
            data.list.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3">
                <TableText>{member.name}</TableText>
                <StatusBadge tone={statusTone(displayStatus(member))}>
                  {t(`users.status.${displayStatus(member)}`)}
                </StatusBadge>
              </div>
            ))
          ) : (
            <TableText tone="hint" className="whitespace-normal">
              {t('depts.noMembers')}
            </TableText>
          )}
        </div>
      )}
    </QueryState>
  );
}
