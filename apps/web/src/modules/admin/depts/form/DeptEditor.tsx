import { organizationErrorKey } from '../organization-errors';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import { SelectControl } from '@/components/ui/select';
import { PageSection } from '@/components/pro/page-scaffold';
import { TableText } from '@/components/pro/TableText';
import { DeptImpact, type DeptImpactPreview } from './DeptImpact';
import { DepartmentFormSchema, departmentApi, type Department } from '../api';
import { DeptLeaderField } from './DeptLeaderField';
export function DeptEditor({
  initial,
  parentId,
  kind: initialKind,
  departments,
  onClose,
  onSaved,
}: {
  initial?: Department;
  parentId?: string;
  kind?: 'company' | 'department';
  departments: Department[];
  onClose: (id?: string) => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [baseline] = useState(initial);
  const form = useForm<z.input<typeof DepartmentFormSchema>, unknown, z.output<typeof DepartmentFormSchema>>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: {
      name: initial?.name ?? '',
      kind: initial?.kind ?? initialKind ?? (departments.length ? 'department' : 'company'),
      code: initial?.code ?? null,
      leaderId: initial?.leaderId ?? null,
      headcount: initial?.headcount ?? null,
      parentId: initial?.parentId ?? parentId ?? null,
      enabled: initial?.enabled ?? true,
      sort: initial?.sort ?? 0,
    },
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const lock = useRef(false);
  const [preview, setPreview] = useState<DeptImpactPreview>();
  const [acknowledged, setAcknowledged] = useState(false);
  const kind = useWatch({ control: form.control, name: 'kind' });
  const parentValue = useWatch({ control: form.control, name: 'parentId' });
  const descendants = new Set(baseline ? [baseline.id] : []);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of departments)
      if (node.parentId && descendants.has(node.parentId) && !descendants.has(node.id)) {
        descendants.add(node.id);
        changed = true;
      }
  }
  const save = async (values: z.output<typeof DepartmentFormSchema>) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(undefined);
    try {
      let savedId = baseline?.id;
      if (baseline) {
        const structural = values.kind !== baseline.kind || values.parentId !== baseline.parentId;
        const patch = {
          id: baseline.id,
          version: baseline.version,
          name: values.name,
          ...(values.kind !== baseline.kind ? { kind: values.kind } : {}),
          ...(values.code !== baseline.code ? { code: values.code } : {}),
          ...(values.leaderId !== baseline.leaderId ? { leaderId: values.leaderId } : {}),
          ...(values.headcount !== baseline.headcount ? { headcount: values.headcount } : {}),
          ...(values.parentId !== baseline.parentId ? { parentId: values.parentId } : {}),
          ...(values.enabled !== baseline.enabled ? { enabled: values.enabled } : {}),
          ...(values.sort !== baseline.sort ? { sort: values.sort } : {}),
        };
        if (structural && !preview) {
          setPreview(await departmentApi.preview(patch));
          setAcknowledged(false);
          return;
        }
        if (preview && preview.affectedMemberCount > 0 && !acknowledged) return;
        await departmentApi.update({
          ...patch,
          ...(preview ? { impactFingerprint: preview.fingerprint } : {}),
        });
      } else savedId = (await departmentApi.create(values)).id;
      await onSaved();
      onClose(savedId);
    } catch (caught) {
      setPreview(undefined);
      setAcknowledged(false);
      setError(organizationErrorKey(caught));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const invalid = Object.keys(form.formState.errors).length > 0;
  return (
    <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <PageSection
        variant="card"
        title={t(
          baseline
            ? 'depts.actions.edit'
            : kind === 'company'
              ? 'depts.org.newCompany'
              : 'depts.org.newDepartment',
        )}
      >
        <form
          onSubmit={(event) => void form.handleSubmit(save)(event)}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
          onChange={() => {
            setPreview(undefined);
            setAcknowledged(false);
          }}
          noValidate
        >
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="dept-kind">{t('depts.org.kind')}</FieldLabel>
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <SelectControl
                  id="dept-kind"
                  value={field.value ?? 'department'}
                  disabled={pending}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setPreview(undefined);
                  }}
                  options={[
                    { value: 'company', label: t('depts.org.company') },
                    { value: 'department', label: t('depts.org.department') },
                  ]}
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-name" required>
              {t('depts.org.name')}
            </FieldLabel>
            <Input
              id="dept-name"
              disabled={pending}
              aria-invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-code">{t('depts.org.code')}</FieldLabel>
            <Input
              id="dept-code"
              disabled={pending}
              aria-invalid={!!form.formState.errors.code}
              {...form.register('code', {
                setValueAs: (value: unknown) => (typeof value === 'string' && value.trim() ? value : null),
              })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-leader">{t('depts.fields.leader')}</FieldLabel>
            <Controller
              control={form.control}
              name="leaderId"
              render={({ field }) => (
                <DeptLeaderField {...field} id="dept-leader" value={field.value ?? null} disabled={pending} />
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-headcount">{t('depts.headcountLabel')}</FieldLabel>
            <Input
              id="dept-headcount"
              type="number"
              min={0}
              step={1}
              disabled={pending}
              aria-invalid={!!form.formState.errors.headcount}
              {...form.register('headcount', {
                setValueAs: (value: unknown) => (value === '' || value === null ? null : Number(value)),
              })}
            />
            <FieldDescription>{t('depts.headcountHint')}</FieldDescription>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="dept-parent">{t('depts.org.parent')}</FieldLabel>
            <Controller
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <SelectControl
                  id="dept-parent"
                  value={field.value ?? ''}
                  disabled={pending}
                  onValueChange={(value) => {
                    field.onChange(value || null);
                    setPreview(undefined);
                  }}
                  options={[
                    ...(kind === 'company' &&
                    (!departments.some((node) => node.kind === 'company' && !node.parentId) ||
                      baseline?.parentId === null)
                      ? [{ value: '', label: t('depts.org.rootCompany') }]
                      : []),
                    ...departments
                      .filter(
                        (node) =>
                          (node.effectiveEnabled || node.id === baseline?.parentId) &&
                          !descendants.has(node.id) &&
                          (kind !== 'company' || node.kind === 'company'),
                      )
                      .map((node) => ({ value: node.id, label: node.name })),
                  ]}
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-enabled">{t('depts.status')}</FieldLabel>
            <Controller
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <SelectControl
                  id="dept-enabled"
                  value={field.value ? 'enabled' : 'disabled'}
                  disabled={pending}
                  onValueChange={(value) => field.onChange(value === 'enabled')}
                  options={[
                    { value: 'enabled', label: t('depts.fields.enabled') },
                    { value: 'disabled', label: t('depts.fields.disabled') },
                  ]}
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-sort">{t('depts.sort')}</FieldLabel>
            <Input
              id="dept-sort"
              type="number"
              step={1}
              disabled={pending}
              {...form.register('sort', { valueAsNumber: true })}
            />
          </Field>
          <FieldError className="sm:col-span-2" role="alert">
            {error ? t(error) : invalid ? t('depts.invalidValues') : null}
          </FieldError>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onClose()}>
              {t('depts.cancel')}
            </Button>
            <Button
              type="submit"
              loading={pending}
              disabled={!!preview && preview.affectedMemberCount > 0 && !acknowledged}
            >
              {t(
                preview
                  ? 'depts.org.confirm'
                  : baseline && (kind !== baseline.kind || parentValue !== baseline.parentId)
                    ? 'depts.org.preview'
                    : 'depts.save',
              )}
            </Button>
          </div>
        </form>
      </PageSection>
      <div className="grid content-start gap-4">
        <PageSection title={t('depts.org.kind')}>
          <div className="mt-3 grid gap-3">
            <TableText className="whitespace-normal">{t('depts.org.hierarchyHint')}</TableText>
            <TableText tone="hint" className="whitespace-normal">
              {t('depts.org.companyHint')}
            </TableText>
          </div>
        </PageSection>
        {preview && (
          <PageSection title={t('depts.org.previewTitle')}>
            <div className="mt-3">
              <DeptImpact preview={preview} acknowledged={acknowledged} onAcknowledge={setAcknowledged} />
            </div>
          </PageSection>
        )}
      </div>
    </div>
  );
}
