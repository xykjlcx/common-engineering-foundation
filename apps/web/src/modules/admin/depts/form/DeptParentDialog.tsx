import { organizationErrorKey } from '../organization-errors';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/dialog';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { PickerPanel } from '@/components/pro/PickerPanel';
import { DeptImpact, type DeptImpactPreview } from './DeptImpact';
import { departmentApi, type Department } from '../api';

export function DeptParentDialog({
  row,
  departments,
  onClose,
  onSaved,
}: {
  row: Department;
  departments: Department[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [parentId, setParentId] = useState<string | null>(row.parentId);
  const [preview, setPreview] = useState<DeptImpactPreview>();
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const excluded = new Set([row.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of departments)
      if (node.parentId && excluded.has(node.parentId) && !excluded.has(node.id)) {
        excluded.add(node.id);
        changed = true;
      }
  }
  const submit = async () => {
    if (!parentId || parentId === row.parentId || pending) return;
    const patch = { id: row.id, version: row.version, parentId };
    setPending(true);
    setError(undefined);
    try {
      if (!preview) {
        setPreview(await departmentApi.preview(patch));
        return;
      }
      if (preview.affectedMemberCount > 0 && !acknowledged) return;
      await departmentApi.update({ ...patch, impactFingerprint: preview.fingerprint });
      await onSaved();
      onClose();
    } catch (caught) {
      setPreview(undefined);
      setAcknowledged(false);
      setError(organizationErrorKey(caught));
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
        title={`${t('depts.org.adjustParent')} · ${row.name}`}
        description={t('depts.org.hierarchyHint')}
        cancelText={t('depts.cancel')}
        submitText={t(preview ? 'depts.org.confirm' : 'depts.org.preview')}
        submitLoading={pending}
        submitDisabled={
          !parentId ||
          parentId === row.parentId ||
          (!!preview && preview.affectedMemberCount > 0 && !acknowledged)
        }
        error={error ? t(error) : undefined}
        onCancel={() => {
          if (!pending) onClose();
        }}
        onSubmit={submit}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PickerPanel
            appearance="inline"
            indicator
            value={parentId}
            onChange={(value) => {
              if (pending) return;
              setParentId(value);
              setPreview(undefined);
              setAcknowledged(false);
            }}
            aria-label={t('depts.org.parent')}
            nodes={departments
              .filter((node) => !excluded.has(node.id))
              .map((node) => ({
                value: node.id,
                parentValue: node.parentId,
                label: node.name,
                disabled:
                  pending || !node.effectiveEnabled || (row.kind === 'company' && node.kind !== 'company'),
                meta: t(node.kind === 'company' ? 'depts.org.company' : 'depts.org.department'),
              }))}
            labels={{
              searchPlaceholder: t('depts.search'),
              frequent: '',
              empty: t('depts.org.noMatch'),
              matchHint: (query, count) => `${query} · ${count}`,
              hints: [],
            }}
          />
          {preview && (
            <DeptImpact preview={preview} acknowledged={acknowledged} onAcknowledge={setAcknowledged} />
          )}
        </div>
      </FormDialogContent>
    </Dialog>
  );
}
