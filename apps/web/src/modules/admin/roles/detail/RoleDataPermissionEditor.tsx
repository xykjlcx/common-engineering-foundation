import { FieldError } from '@/components/ui/field';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SelectControl } from '@/components/ui/select';
import {
  normalizeRoleDataPermission,
  type DataScope,
  type RoleDataPermission,
} from '@/modules/admin/roles/api';
import type { DeptDto } from '@/modules/admin/depts/api';

interface DataPermissionDraftState {
  roleId: string;
  source: RoleDataPermission;
  draft: RoleDataPermission;
}

function cloneDataPermission(permission: RoleDataPermission): RoleDataPermission {
  return structuredClone(permission);
}

function DepartmentPicker({
  label,
  departments,
  selectedIds,
  onChange,
  disabled,
}: {
  label: string;
  departments: Pick<DeptDto, 'id' | 'name'>[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('admin');
  const selected = new Set(selectedIds);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={label} disabled={disabled}>
          {selectedIds.length > 0
            ? t('roles.dataPermission.departmentsSelected', { count: selectedIds.length })
            : t('roles.dataPermission.selectDepartments')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <FieldSet>
          <FieldLegend>{t('roles.dataPermission.visibleDepartments')}</FieldLegend>
          {departments.map((department) => (
            <Field key={department.id} className="flex grid-cols-[auto_1fr] items-center gap-2">
              <Checkbox
                id={`role-data-dept-${department.id}`}
                checked={selected.has(department.id)}
                aria-label={department.name}
                onCheckedChange={(checked) => {
                  onChange(
                    checked
                      ? [...selectedIds, department.id]
                      : selectedIds.filter((id) => id !== department.id),
                  );
                }}
              />
              <FieldLabel htmlFor={`role-data-dept-${department.id}`}>{department.name}</FieldLabel>
            </Field>
          ))}
        </FieldSet>
      </PopoverContent>
    </Popover>
  );
}

export function RoleDataPermissionEditor({
  roleId,
  permission,
  departments,
  canGrant,
  onSave,
  onDirtyChange,
}: {
  roleId: string;
  permission: RoleDataPermission;
  departments: Pick<DeptDto, 'id' | 'name'>[];
  canGrant: boolean;
  onSave: (id: string, permission: RoleDataPermission) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t } = useTranslation('admin');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draftState, setDraftState] = useState<DataPermissionDraftState>(() => ({
    roleId,
    source: permission,
    draft: cloneDataPermission(permission),
  }));
  const draft =
    draftState.roleId === roleId && draftState.source === permission
      ? draftState.draft
      : cloneDataPermission(permission);

  const dirty =
    JSON.stringify(normalizeRoleDataPermission(draft)) !==
    JSON.stringify(normalizeRoleDataPermission(permission));
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await onSave(roleId, normalizeRoleDataPermission(draft));
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  // 不 memo：只在本组件的 JSX 事件处理里直接调用，不进任何依赖数组，也没有会比较 props 的下游。
  const updateDraft = (updater: (current: RoleDataPermission) => RoleDataPermission) => {
    setDraftState((current) => {
      const base =
        current.roleId === roleId && current.source === permission
          ? current.draft
          : cloneDataPermission(permission);
      return { roleId, source: permission, draft: updater(base) };
    });
  };

  const defaultScopeOptions = useMemo(
    () =>
      (['all', 'deptAndChildren', 'dept', 'self', 'custom'] as const).map((scope) => ({
        value: scope,
        label: t(`roles.dataPermission.scopes.${scope}`),
      })),
    [t],
  );
  return (
    <div data-role-data-permission-editor className="flex flex-col">
      <FieldError role="alert">{failed ? t('roles.saveFailed') : null}</FieldError>
      <FieldGroup className="mb-4 grid grid-cols-[minmax(220px,360px)_1fr] items-end gap-3">
        <Field>
          <FieldLabel htmlFor="role-default-data-scope">{t('roles.dataPermission.defaultScope')}</FieldLabel>
          <SelectControl
            id="role-default-data-scope"
            disabled={!canGrant || saving}
            value={draft.defaultScope}
            options={defaultScopeOptions}
            aria-label={t('roles.dataPermission.defaultScope')}
            onValueChange={(value) => {
              updateDraft((current) => ({
                ...current,
                defaultScope: value as DataScope,
                defaultDepartmentIds: value === 'custom' ? current.defaultDepartmentIds : [],
              }));
            }}
          />
          <FieldDescription>{t('roles.dataPermission.defaultScopeDesc')}</FieldDescription>
        </Field>
        {draft.defaultScope === 'custom' ? (
          <Field>
            <FieldLabel>{t('roles.dataPermission.customDepartments')}</FieldLabel>
            <DepartmentPicker
              disabled={!canGrant || saving}
              label={t('roles.dataPermission.selectDefaultDepartments')}
              departments={departments}
              selectedIds={draft.defaultDepartmentIds}
              onChange={(defaultDepartmentIds) => {
                updateDraft((current) => ({ ...current, defaultDepartmentIds }));
              }}
            />
          </Field>
        ) : null}
      </FieldGroup>

      <div data-role-data-permission-content />

      {canGrant ? (
        <div className="mt-3 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDraftState({ roleId, source: permission, draft: cloneDataPermission(permission) })
            }
          >
            {t('roles.actions.reset')}
          </Button>
          <Button type="button" size="sm" loading={saving} onClick={() => void save()}>
            {t('roles.actions.saveDataPermissions')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
