import { organizationErrorKey } from '@/modules/admin/depts/api';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import type { UserMovePreviewSchema } from '@keel/core/user-batch-contract';
import { PickerPanel } from '@/components/pro/PickerPanel';
import { QueryState } from '@/components/pro/QueryState';
import { TableText } from '@/components/pro/TableText';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { userDeptTreeQuery, userApi, useUserMutations, type UserTargets } from '../api';

export function UsersMoveDialog({
  targets,
  targetNames,
  initialDeptId,
  onClose,
  onSuccess,
}: {
  targets: UserTargets;
  targetNames?: Readonly<Record<string, string>>;
  initialDeptId?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation('admin');
  const departments = useQuery(userDeptTreeQuery);
  const { batchMove } = useUserMutations();
  const [deptId, setDeptId] = useState<string | null>(initialDeptId ?? null);
  const [chosen, setChosen] = useState(initialDeptId !== undefined);
  const [preview, setPreview] = useState<z.infer<typeof UserMovePreviewSchema>>();
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const choose = (value: string | null) => {
    setDeptId(value);
    setChosen(true);
    setPreview(undefined);
    setAcknowledged(false);
  };
  const submit = async () => {
    if (!chosen || pending) return;
    setPending(true);
    setError(undefined);
    try {
      if (!preview) {
        setPreview(await userApi.previewMove({ targets, deptId }));
        return;
      }
      if (preview.companyChangeCount > 0 && !acknowledged) return;
      await batchMove.mutateAsync({ targets, deptId, impactFingerprint: preview.fingerprint });
      onSuccess?.();
      onClose();
    } catch (caught) {
      setError(organizationErrorKey(caught, 'users.form.saveFailed'));
      setPreview(undefined);
      setAcknowledged(false);
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <FormDialogContent
        size="list"
        title={t('users.actions.move')}
        description={t('users.move.description', { count: targets.length })}
        targets={{
          summary: t('users.bulk.viewTargets', { count: targets.length }),
          items: targets.map((target) => ({ id: target.id, label: targetNames?.[target.id] ?? target.id })),
        }}
        error={error ? t(error) : undefined}
        cancelText={t('users.actions.cancel')}
        submitText={t(preview ? 'depts.org.confirm' : 'depts.org.preview')}
        submitLoading={pending}
        submitDisabled={
          !chosen || !departments.isSuccess || (!!preview && preview.companyChangeCount > 0 && !acknowledged)
        }
        onCancel={() => {
          if (!pending) onClose();
        }}
        onSubmit={submit}
      >
        <div className="grid gap-3">
          <QueryState
            data={departments.data}
            pending={departments.isPending}
            error={departments.isError}
            loadingLabel={t('users.loading.list')}
            errorLabel={t('users.loadFailed')}
            retryLabel={t('users.retry')}
            onRetry={() => void departments.refetch()}
          >
            {(nodes) => (
              <PickerPanel
                indicator
                appearance="inline"
                density="compact"
                nodes={nodes.map((node) => ({
                  value: node.id,
                  parentValue: node.parentId,
                  label: node.name,
                  disabled: pending || !node.enabled,
                  meta: node.enabled ? undefined : t('users.move.disabled'),
                }))}
                value={deptId}
                onChange={choose}
                aria-label={t('users.form.dept')}
                labels={{
                  searchPlaceholder: t('users.move.search'),
                  frequent: t('users.filters.frequent'),
                  empty: t('users.filters.noMatch'),
                  matchHint: (query, count) => t('users.filters.matchHint', { query, count }),
                  hints: [],
                }}
              />
            )}
          </QueryState>
          <Button type="button" variant="outline" disabled={pending} onClick={() => choose(null)}>
            {t('depts.org.unassigned')}
            {chosen && deptId === null ? ' ✓' : ''}
          </Button>
          {preview && (
            <div className="grid gap-3" aria-live="polite">
              <TableText tone="strong">{preview.deptName ?? t('depts.org.unassigned')}</TableText>
              <TableText>
                {t('depts.org.companyOf')}: {preview.companyName ?? t('depts.org.unassigned')}
              </TableText>
              {preview.items.map((item) => (
                <TableText key={item.id} tone="hint">
                  {item.name} · {item.fromNodeName ?? t('depts.org.unassigned')} →{' '}
                  {preview.deptName ?? t('depts.org.unassigned')}
                </TableText>
              ))}
              <TableText>{t('depts.org.affected', { count: preview.companyChangeCount })}</TableText>
              <TableText tone="hint">{t('depts.org.scopeHint')}</TableText>
              {preview.companyChangeCount > 0 && (
                <label className="flex items-start gap-2">
                  <Checkbox checked={acknowledged} onCheckedChange={setAcknowledged} />
                  <TableText>{t('depts.org.acknowledge')}</TableText>
                </label>
              )}
            </div>
          )}
        </div>
      </FormDialogContent>
    </Dialog>
  );
}
