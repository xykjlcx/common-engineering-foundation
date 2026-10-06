import { useRef, useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { FieldDescription } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { filterSchemesQuery, useFilterSchemeMutations } from '../api';

export function SchemeManagerDialog({
  open,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (schemeId: string) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: schemes = [] } = useQuery(filterSchemesQuery);
  const { updateScheme, deleteScheme } = useFilterSchemeMutations();
  const versions = useRef<Record<string, number>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; version: number } | null>(
    null,
  );

  const nameOf = (id: string, fallback: string) => names[id] ?? fallback;

  const submit = async () => {
    const renamed = schemes.filter((scheme) => {
      const next = names[scheme.id];
      return scheme.editable && next !== undefined && next.trim() !== '' && next.trim() !== scheme.name;
    });
    if (updateScheme.isPending) return;
    try {
      for (const scheme of renamed) {
        await updateScheme.mutateAsync({
          id: scheme.id,
          dto: {
            name: (names[scheme.id] ?? scheme.name).trim(),
            version: versions.current[scheme.id] ?? scheme.version,
          },
        });
      }
      setNames({});
      versions.current = {};
      onOpenChange(false);
    } catch {
      /* 保留名字和版本草稿，错误由当前弹窗回读。 */
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteScheme.mutateAsync({ id: pendingDelete.id, version: pendingDelete.version });
    onDeleted(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (updateScheme.isPending || deleteScheme.isPending) return;
          if (!next) {
            setNames({});
            versions.current = {};
          }
          onOpenChange(next);
        }}
      >
        <FormDialogContent
          size="md"
          title={t('users.filters.manageSchemes')}
          description={t('users.filters.manageSchemesDesc')}
          cancelText={t('users.actions.cancel')}
          submitText={t('users.actions.save')}
          submitLoading={updateScheme.isPending}
          error={updateScheme.isError ? t('users.filters.schemeSaveFailed') : undefined}
          onCancel={() => {
            if (!updateScheme.isPending && !deleteScheme.isPending) onOpenChange(false);
          }}
          onSubmit={submit}
        >
          {schemes.length === 0 ? (
            <FieldDescription size="body">{t('users.filters.manageSchemesEmpty')}</FieldDescription>
          ) : (
            <ul className="flex flex-col gap-[calc(8px*var(--app-scale))]">
              {schemes.map((scheme) => (
                <li key={scheme.id} className="flex items-center gap-[calc(8px*var(--app-scale))]">
                  {scheme.editable ? (
                    <>
                      <Input
                        disabled={updateScheme.isPending || deleteScheme.isPending}
                        value={nameOf(scheme.id, scheme.name)}
                        aria-label={`${t('users.filters.renameScheme')} ${scheme.name}`}
                        autoComplete="off"
                        onChange={(event) => {
                          versions.current[scheme.id] ??= scheme.version;
                          setNames((current) => ({ ...current, [scheme.id]: event.target.value }));
                        }}
                      />
                      <Button
                        type="button"
                        variant="danger-ghost"
                        disabled={updateScheme.isPending || deleteScheme.isPending}
                        aria-label={`${t('users.filters.deleteScheme')} ${scheme.name}`}
                        onClick={() =>
                          setPendingDelete({ id: scheme.id, name: scheme.name, version: scheme.version })
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span>{scheme.name}</span>
                      <FieldDescription>{t('users.filters.schemeReadonly')}</FieldDescription>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </FormDialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        severity="irreversible"
        title={t('users.filters.deleteSchemeTitle', { name: pendingDelete?.name ?? '' })}
        description={t('users.filters.deleteSchemeDesc')}
        cancelText={t('users.actions.cancel')}
        confirmText={t('users.filters.deleteScheme')}
        pending={deleteScheme.isPending}
        error={deleteScheme.isError ? t('users.filters.schemeDeleteFailed') : undefined}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
