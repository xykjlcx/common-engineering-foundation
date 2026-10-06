import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { FieldError } from '@/components/ui/field';
import { SearchField } from '@/components/pro/SearchField';
import { DataTable } from '@/components/pro/DataTable';
import { TableText } from '@/components/pro/TableText';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { PermissionResourceDto, PermissionTreeGroupDto, RolePermissionMap } from '../api';
import { TriStateButton } from '../components/PermissionControls';
import { cleanPermissions, clonePermissions, permissionColumn, permissionColumns } from '../model';
import type { TriState } from '../types';

export function RolePermissionEditor({
  roleId,
  permissionTree,
  rolePermissions,
  canGrant,
  memberCount = null,
  onSave,
  onDirtyChange,
}: {
  roleId: string;
  permissionTree: PermissionTreeGroupDto[];
  rolePermissions: RolePermissionMap;
  canGrant: boolean;
  memberCount?: number | null;
  onSave: (id: string, permissions: RolePermissionMap) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t } = useTranslation('admin');
  const [draft, setDraft] = useState(() => clonePermissions(rolePermissions));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [onlyGranted, setOnlyGranted] = useState(false);
  const [showAllChanges, setShowAllChanges] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const entries = permissionTree.flatMap((group) =>
    group.resources.flatMap((resource) => resource.actions.map((action) => ({ resource, action }))),
  );
  const has = (resourceId: string, id: string) => draft[resourceId]?.includes(id) ?? false;
  const changes = entries.filter(
    ({ resource, action }) =>
      has(resource.id, action.id) !== (rolePermissions[resource.id]?.includes(action.id) ?? false),
  );
  const dirty = changes.length > 0;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  const count = entries.filter(({ resource, action }) => has(resource.id, action.id)).length;
  const state = (resources: PermissionResourceDto[]): TriState => {
    const actions = resources.flatMap((resource) =>
      resource.actions.map((action) => has(resource.id, action.id)),
    );
    return actions.every(Boolean) && actions.length ? 'all' : actions.some(Boolean) ? 'some' : 'none';
  };
  const toggleResources = (resources: PermissionResourceDto[]) => {
    const grant = state(resources) !== 'all';
    setDraft((current) =>
      cleanPermissions({
        ...current,
        ...Object.fromEntries(
          resources.map((resource) => [
            resource.id,
            grant
              ? [
                  ...new Set([
                    ...(current[resource.id] ?? []),
                    ...resource.actions.map((action) => action.id),
                  ]),
                ]
              : (current[resource.id] ?? []).filter(
                  (id) => !resource.actions.some((action) => action.id === id),
                ),
          ]),
        ),
      }),
    );
  };
  const toggleAction = (resource: PermissionResourceDto, id: string) =>
    setDraft((current) =>
      cleanPermissions({
        ...current,
        [resource.id]: current[resource.id]?.includes(id)
          ? (current[resource.id] ?? []).filter((value) => value !== id)
          : [...(current[resource.id] ?? []), id],
      }),
    );
  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await onSave(roleId, cleanPermissions(draft));
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  const actionLabel = (action: PermissionResourceDto['actions'][number]) =>
    action.label || t('roles.matrix.openPage');
  const normalized = keyword.trim().toLowerCase();
  const filtering = !!normalized || onlyGranted;
  const matches = (text: string) => text.toLowerCase().includes(normalized);
  const groups = permissionTree
    .map((group) => ({
      ...group,
      resources: group.resources
        .map((resource) => ({
          ...resource,
          actions: resource.actions.filter(
            (action) =>
              (!onlyGranted || has(resource.id, action.id)) &&
              (!normalized ||
                matches(group.label) ||
                matches(resource.label) ||
                matches(actionLabel(action)) ||
                matches(action.code ?? action.id)),
          ),
        }))
        .filter((resource) => resource.actions.length),
    }))
    .filter((group) => group.resources.length);
  const visibleResources = groups.flatMap((group) => group.resources);
  const visibleCount = visibleResources.reduce((sum, resource) => sum + resource.actions.length, 0);
  const allVisibleGranted = visibleCount > 0 && state(visibleResources) === 'all';
  const columns: ColumnDef<PermissionResourceDto & { group?: PermissionTreeGroupDto }>[] = [
    {
      id: 'resource',
      header: t('roles.matrix.page'),
      size: 180,
      minSize: 160,
      cell: ({ row }) =>
        row.original.group ? (
          <div className="flex items-center gap-2">
            <TriStateButton
              state={state(row.original.group.resources)}
              ariaLabel={t('roles.permission.toggleGroup', { group: row.original.label })}
              disabled={!canGrant || saving}
              onClick={() => toggleResources(row.original.group?.resources ?? [])}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={!collapsed.includes(row.original.id)}
              aria-label={t(
                collapsed.includes(row.original.id)
                  ? 'roles.permission.expandGroup'
                  : 'roles.permission.collapseGroup',
                { group: row.original.label },
              )}
              onClick={() =>
                setCollapsed((current) =>
                  current.includes(row.original.id)
                    ? current.filter((id) => id !== row.original.id)
                    : [...current, row.original.id],
                )
              }
            >
              {collapsed.includes(row.original.id) ? <ChevronRight /> : <ChevronDown />}
              {row.original.label}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <TriStateButton
              state={state([row.original])}
              ariaLabel={t('roles.permission.toggleResource', { resource: row.original.label })}
              disabled={!canGrant || saving}
              onClick={() => toggleResources([row.original])}
            />
            <div className="grid min-w-0 gap-1">
              <TableText>{row.original.label}</TableText>
              <TableText tone="hint" mono>
                {row.original.code}
              </TableText>
            </div>
          </div>
        ),
    },
    ...permissionColumns.map((column) => ({
      id: column,
      header: t(`roles.matrix.${column}`),
      size: column === 'view' ? 168 : column === 'other' ? 168 : 104,
      minSize: column === 'view' || column === 'other' ? 148 : 96,
      cell: ({ row }: { row: { original: PermissionResourceDto & { group?: PermissionTreeGroupDto } } }) => {
        if (row.original.group) return null;
        const actions = row.original.actions.filter(
          (action) => permissionColumn(action.code ?? action.id) === column,
        );
        return actions.length ? (
          <div className="grid gap-1 py-1">
            {actions.map((action) => (
              <Label key={action.id} title={action.code ?? action.id} className="items-start py-1">
                <Checkbox
                  aria-label={t('roles.permission.toggleAction', {
                    resource: row.original.label,
                    action: actionLabel(action),
                  })}
                  checked={has(row.original.id, action.id)}
                  disabled={!canGrant || saving}
                  onCheckedChange={() => toggleAction(row.original, action.id)}
                />
                <TableText muted={!canGrant} className="whitespace-normal break-words">
                  {actionLabel(action)}
                </TableText>
              </Label>
            ))}
          </div>
        ) : (
          <TableText tone="hint" title={t('roles.matrix.noActions')}>
            —
          </TableText>
        );
      },
    })),
  ];
  return (
    <div className="grid min-w-0 gap-3">
      <FieldError role="alert">{failed ? t('roles.saveFailed') : null}</FieldError>
      {dirty && (
        <Alert variant="warning" role="status" data-role-unsaved>
          <AlertDescription className="w-full">
            <div className="flex w-full flex-wrap items-center gap-3">
              <div className="grid min-w-0 flex-1 gap-1">
                <TableText tone="strong">{t('roles.matrix.unsaved')}</TableText>
                <TableText className="whitespace-normal break-words">
                  {changes
                    .slice(0, showAllChanges ? changes.length : 3)
                    .map(
                      ({ resource, action }) =>
                        `${has(resource.id, action.id) ? '+' : '−'}${resource.label}·${actionLabel(action)}`,
                    )
                    .join(' ')}
                  {!showAllChanges && changes.length > 3
                    ? t('roles.matrix.more', { count: changes.length })
                    : ''}
                </TableText>
                {changes.length > 3 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="justify-self-start"
                    onClick={() => setShowAllChanges(!showAllChanges)}
                  >
                    {t(showAllChanges ? 'roles.matrix.hideChanges' : 'roles.matrix.showChanges', {
                      count: changes.length,
                    })}
                  </Button>
                )}
                <TableText tone="hint">
                  {memberCount === null
                    ? t('roles.memberCountUnknown')
                    : t('roles.matrix.affects', { count: memberCount })}
                </TableText>
              </div>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setDraft(clonePermissions(rolePermissions));
                  setFailed(false);
                }}
              >
                {t('roles.matrix.discard')}
              </Button>
              <Button disabled={!canGrant} loading={saving} onClick={() => void save()}>
                {t('roles.actions.save')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      <div data-role-permission-action-bar className="flex flex-wrap items-center gap-2">
        <SearchField
          containerClassName="w-56"
          value={keyword}
          placeholder={t('roles.permissionSearchPlaceholder')}
          onChange={(event) => {
            setKeyword(event.target.value);
            setCollapsed([]);
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(collapsed.length ? [] : permissionTree.map((group) => group.id))}
        >
          {t(collapsed.length ? 'roles.actions.expand' : 'roles.actions.collapse')}
        </Button>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={onlyGranted}
            onCheckedChange={(checked) => {
              setOnlyGranted(checked === true);
              setCollapsed([]);
            }}
          />
          <TableText>{t('roles.matrix.onlyGranted')}</TableText>
        </label>
        <TableText tone="hint">
          {t('roles.permission.granted', { granted: count, total: entries.length })}
        </TableText>
        {canGrant && (
          <Button
            variant="outline"
            size="sm"
            disabled={saving || !visibleCount}
            onClick={() => toggleResources(visibleResources)}
          >
            {t(
              filtering
                ? allVisibleGranted
                  ? 'roles.matrix.revokeVisible'
                  : 'roles.matrix.grantVisible'
                : allVisibleGranted
                  ? 'roles.actions.cancelAll'
                  : 'roles.actions.grantAll',
            )}
          </Button>
        )}
      </div>
      {filtering && (
        <TableText tone="hint" className="whitespace-normal">
          {t('roles.matrix.filterHint', { count: visibleCount })}
        </TableText>
      )}
      <div data-role-tab-content-scroll className="min-w-0 pb-6">
        <DataTable
          columns={columns}
          data={groups.flatMap((group) => [
            { id: group.id, label: group.label, code: '', actions: [], group },
            ...(!collapsed.includes(group.id) ? group.resources : []),
          ])}
          rowKey={(row) => row.id}
          emptyText={t('roles.noPermissionResult')}
          loadingText={t('roles.refreshing')}
        />
      </div>
    </div>
  );
}
