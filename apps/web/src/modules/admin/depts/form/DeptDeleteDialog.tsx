import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/dialog';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { QueryState } from '@/components/pro/QueryState';
import { TableText } from '@/components/pro/TableText';
import { Button } from '@/components/ui/button';
import { departmentApi, departmentReferencesQuery, type Department } from '../api';

export function DeptDeleteDialog({
  row,
  onClose,
  onDeleted,
  onMembers,
  onSelect,
}: {
  row: Department;
  onClose: () => void;
  onDeleted: () => Promise<void>;
  onMembers: () => void;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const query = useQuery(departmentReferencesQuery(row.id));
  const [error, setError] = useState(false);
  const refs = query.data;
  const blocked =
    !refs ||
    refs.children.length > 0 ||
    refs.memberCount > 0 ||
    refs.archivedMemberCount > 0 ||
    refs.roles.length > 0;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <FormDialogContent
        title={`${t('depts.actions.delete')} ${row.name}`}
        description={t(blocked ? 'depts.org.deleteBlocked' : 'depts.deleteDescription')}
        submitText={t('depts.actions.delete')}
        cancelText={t('depts.cancel')}
        submitDisabled={blocked}
        error={error ? t('depts.deleteFailed') : undefined}
        onCancel={onClose}
        onSubmit={async () => {
          try {
            await departmentApi.delete({ id: row.id, version: row.version });
            await onDeleted();
            onClose();
          } catch {
            setError(true);
            void query.refetch();
          }
        }}
      >
        <QueryState
          data={refs}
          pending={query.isPending}
          error={query.isError}
          loadingLabel={t('depts.loading')}
          errorLabel={t('depts.loadFailed')}
          retryLabel={t('depts.retry')}
          onRetry={() => void query.refetch()}
        >
          {(data) => (
            <div className="grid gap-3">
              {data.memberCount > 0 && (
                <Button variant="link" onClick={onMembers}>
                  {t('depts.org.membersTitle')} · {data.memberCount}
                </Button>
              )}
              {data.children.map((child) => (
                <Button key={child.id} variant="link" onClick={() => onSelect(child.id)}>
                  {t('depts.org.adjustParent')} · {child.name}
                </Button>
              ))}
              {data.archivedMemberCount > 0 && (
                <TableText>{t('depts.org.archived', { count: data.archivedMemberCount })}</TableText>
              )}
              {data.roles.map((role) => (
                <Button
                  key={role.id}
                  variant="link"
                  onClick={() => void navigate({ to: '/admin/roles', search: { roleId: role.id } })}
                >
                  {t('depts.org.roles')} · {role.name}
                </Button>
              ))}
            </div>
          )}
        </QueryState>
      </FormDialogContent>
    </Dialog>
  );
}
