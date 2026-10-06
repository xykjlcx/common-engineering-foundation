import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DeptTree } from './DeptTree';
import { SearchField } from '@/components/pro/SearchField';
import { TableText } from '@/components/pro/TableText';
import { QueryState } from '@/components/pro/QueryState';
import { useLastSuccessfulData } from '@/components/pro/use-last-successful-data';
import { PageFrame, PageSurface } from '@/components/pro/page-scaffold';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { matchDeclaredAction } from '@/lib/permission';
import { auditKeys } from '@/modules/admin/audit/api';
import { userKeys } from '@/modules/admin/users/api/keys';
import { departmentTreeQuery, departmentApi, deptKeys, type Department } from '../api';
import { DeptDetail } from '../detail/DeptDetail';
import { DeptEditor } from '../form/DeptEditor';
import { DeptParentDialog } from '../form/DeptParentDialog';
import { DeptDeleteDialog } from '../form/DeptDeleteDialog';
import { DeptMembers } from '../detail/DeptMembers';
import { DeptChanges } from '../detail/DeptChanges';
import { SelectControl } from '@/components/ui/select';

export type DeptViewMode = 'chart' | 'create' | 'edit' | 'members' | 'add-members' | 'changes';
export type DeclaredDeptAction = { code: string; superuserOnly?: true };

export function DeptsScene({
  permissions,
  systemAdmin = false,
  actions,
  deptId = '',
  keyword = '',
  view = 'chart',
  kind = 'department',
  parentId,
  companyId = '',
  typeFilter = 'all',
  memberPage = 1,
  memberKeyword = '',
  includeChildren = false,
  onViewChange,
  onFilterChange,
  onKeywordChange,
  onSelect,
}: {
  permissions: string[];
  systemAdmin?: boolean;
  actions: readonly DeclaredDeptAction[];
  deptId?: string;
  keyword?: string;
  view?: DeptViewMode;
  kind?: 'company' | 'department';
  parentId?: string;
  companyId?: string;
  typeFilter?: 'all' | 'company' | 'department';
  memberPage?: number;
  memberKeyword?: string;
  includeChildren?: boolean;
  onViewChange?: (
    view: DeptViewMode,
    patch?: { deptId?: string; parentId?: string; kind?: 'company' | 'department' },
  ) => void;
  onFilterChange?: (patch: {
    companyId?: string;
    typeFilter?: 'all' | 'company' | 'department';
    memberPage?: number;
    memberKeyword?: string;
    includeChildren?: boolean;
  }) => void;
  onKeywordChange?: (keyword: string) => void;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation('admin');
  const query = useQuery(departmentTreeQuery);
  // 刷新失败时留住上一份成功部门树，避免整页塌成错误屏（与 users 列表同一策略）。
  const tree = useLastSuccessfulData(query.data);
  const qc = useQueryClient();
  const [editor, setEditor] = useState<{
    initial?: Department;
    parentId?: string;
    kind?: 'company' | 'department';
  }>();
  const [reparenting, setReparenting] = useState<Department>();
  const [toggling, setToggling] = useState<Department>();
  const [toggleError, setToggleError] = useState(false);
  const [deleting, setDeleting] = useState<Department>();

  const allowed = (code: string) => {
    const declared = actions.find((item) => item.code === code);
    return matchDeclaredAction({ permissions, systemAdmin }, code, declared?.superuserOnly === true);
  };
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: deptKeys.all }),
      qc.invalidateQueries({ queryKey: userKeys.all }),
      qc.invalidateQueries({ queryKey: auditKeys.operationLists() }),
    ]);
  };
  const active =
    tree?.find((row) => row.id === deptId) ?? tree?.find((row) => row.parentId === null) ?? tree?.[0];
  const closeView = (id?: string) => {
    setEditor(undefined);
    onViewChange?.('chart', id ? { deptId: id } : undefined);
    if (!onViewChange && id) onSelect(id);
  };
  const openEditor = (input: {
    initial?: Department;
    parentId?: string;
    kind?: 'company' | 'department';
  }) => {
    if (!onViewChange) setEditor(input);
    onViewChange?.(input.initial ? 'edit' : 'create', {
      deptId: input.initial?.id ?? active?.id,
      parentId: input.parentId,
      kind: input.kind,
    });
  };
  const editing =
    (!onViewChange ? editor : undefined) ??
    (view === 'edit' && active
      ? { initial: active }
      : view === 'create'
        ? { parentId, kind: tree?.length ? kind : ('company' as const) }
        : undefined);
  const canMove = permissions.includes('iam:user:move') || systemAdmin;
  return (
    <PageFrame breadcrumbs={[{ label: t('depts.title') }]}>
      <PageSurface>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <TableText tone="strong">{t('depts.title')}</TableText>
          <TableText tone="hint">
            {t('depts.org.summary', {
              count: tree?.length ?? 0,
              members: tree?.reduce((sum, row) => sum + row.memberCount, 0) ?? 0,
            })}
          </TableText>
          {view === 'chart' && !editor && (
            <div className="ml-auto flex flex-wrap gap-2">
              <SearchField
                containerClassName="w-56"
                aria-label={t('depts.search')}
                placeholder={t('depts.search')}
                value={keyword}
                onChange={(event) => onKeywordChange?.(event.currentTarget.value)}
              />
              <Button variant="secondary" onClick={() => void refresh()}>
                {t('depts.retry')}
              </Button>
              <Button
                disabled={!allowed('iam:dept:create')}
                onClick={() =>
                  openEditor({ parentId: active?.id, kind: tree?.length ? 'department' : 'company' })
                }
              >
                {t('depts.actions.create')}
              </Button>
            </div>
          )}
        </div>
        {view !== 'chart' && !editing ? (
          <Button variant="link" className="self-start" onClick={() => closeView()}>
            {t('depts.org.return')}
          </Button>
        ) : null}
        {editing ? (
          <DeptEditor
            key={editing.initial?.id ?? `new-${editing.parentId ?? 'root'}`}
            {...editing}
            departments={tree ?? []}
            onClose={closeView}
            onSaved={refresh}
          />
        ) : (view === 'members' || view === 'add-members') && active ? (
          <div className="grid gap-4 p-4">
            <TableText tone="strong">
              {active.name} · {t(view === 'add-members' ? 'depts.org.addMembers' : 'depts.org.membersTitle')}
            </TableText>
            <DeptMembers
              key={`${active.id}-${view}`}
              id={active.id}
              managed
              adding={view === 'add-members'}
              canMove={canMove && (view !== 'add-members' || active.effectiveEnabled)}
              page={memberPage}
              keyword={memberKeyword}
              includeChildren={includeChildren}
              onFilterChange={(patch) =>
                onFilterChange?.({
                  memberPage: patch.page,
                  memberKeyword: patch.keyword,
                  includeChildren: patch.includeChildren,
                })
              }
            />
          </div>
        ) : view === 'changes' && active ? (
          <div className="p-4">
            <DeptChanges key={active.id} id={active.id} />
          </div>
        ) : (
          <QueryState
            data={tree}
            pending={query.isPending}
            refreshing={query.isFetching && !query.isPending}
            error={query.isError}
            loadingLabel={t('depts.loading')}
            errorLabel={t('depts.loadFailed')}
            retryLabel={t('depts.retry')}
            onRetry={() => void query.refetch()}
          >
            {(rows) => {
              const active =
                rows.find((row) => row.id === deptId) ?? rows.find((row) => row.parentId === null) ?? rows[0];
              return (
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                  {rows.length ? (
                    <div className="grid min-w-0 content-start gap-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,10rem)]">
                        <SelectControl
                          value={companyId}
                          aria-label={t('depts.org.allCompanies')}
                          onValueChange={(value) => onFilterChange?.({ companyId: value })}
                          options={[
                            { value: '', label: t('depts.org.allCompanies') },
                            ...rows
                              .filter((row) => row.kind === 'company')
                              .map((row) => ({ value: row.id, label: row.name })),
                          ]}
                        />
                        <SelectControl
                          value={typeFilter}
                          aria-label={t('depts.org.kind')}
                          onValueChange={(value) => {
                            if (value === 'all' || value === 'company' || value === 'department')
                              onFilterChange?.({ typeFilter: value });
                          }}
                          options={[
                            { value: 'all', label: t('depts.org.allKinds') },
                            { value: 'company', label: t('depts.org.company') },
                            { value: 'department', label: t('depts.org.department') },
                          ]}
                        />
                      </div>
                      <DeptTree
                        rows={rows}
                        companyId={companyId}
                        typeFilter={typeFilter}
                        keyword={keyword}
                        selectedId={active?.id ?? ''}
                        onSelect={onSelect}
                      />
                    </div>
                  ) : (
                    <div className="col-span-full grid justify-items-center gap-4 py-16">
                      <TableText>{t('depts.firstUse')}</TableText>
                      <Button
                        disabled={!allowed('iam:dept:create')}
                        onClick={() =>
                          openEditor({ parentId: active?.id, kind: tree?.length ? 'department' : 'company' })
                        }
                      >
                        {t('depts.createFirst')}
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    {active ? (
                      <DeptDetail
                        id={active.id}
                        canEdit={allowed('iam:dept:update')}
                        canDelete={allowed('iam:dept:del')}
                        canCreate={allowed('iam:dept:create')}
                        permissions={permissions}
                        systemAdmin={systemAdmin}
                        onAddChild={(kind) => openEditor({ parentId: active.id, kind })}
                        onMembers={() => onViewChange?.('members', { deptId: active.id })}
                        onAddMembers={
                          canMove ? () => onViewChange?.('add-members', { deptId: active.id }) : undefined
                        }
                        onChanges={() => onViewChange?.('changes', { deptId: active.id })}
                        onToggle={(row) => {
                          setToggleError(false);
                          setToggling(row);
                        }}
                        onAdjustParent={setReparenting}
                        onEdit={(row) => openEditor({ initial: row })}
                        onDelete={(row) => {
                          setDeleting(row);
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              );
            }}
          </QueryState>
        )}
        {reparenting && (
          <DeptParentDialog
            row={reparenting}
            departments={tree ?? []}
            onClose={() => setReparenting(undefined)}
            onSaved={refresh}
          />
        )}
        {deleting && (
          <DeptDeleteDialog
            row={deleting}
            onClose={() => setDeleting(undefined)}
            onDeleted={async () => {
              await refresh();
              onSelect('');
            }}
            onMembers={() => {
              setDeleting(undefined);
              onViewChange?.('members', { deptId: deleting.id });
            }}
            onSelect={(id) => {
              setDeleting(undefined);
              onSelect(id);
            }}
          />
        )}
        <ConfirmDialog
          open={!!toggling}
          title={t(toggling?.enabled ? 'depts.fields.disabled' : 'depts.fields.enabled')}
          description={t('depts.org.toggleHint')}
          confirmText={t(toggling?.enabled ? 'depts.fields.disabled' : 'depts.fields.enabled')}
          cancelText={t('depts.cancel')}
          error={toggleError ? t('depts.saveFailed') : undefined}
          onOpenChange={(open) => {
            if (!open) setToggling(undefined);
          }}
          onConfirm={async () => {
            if (!toggling) return;
            try {
              await departmentApi.update({
                id: toggling.id,
                version: toggling.version,
                enabled: !toggling.enabled,
              });
              await refresh();
              setToggling(undefined);
            } catch {
              setToggleError(true);
            }
          }}
        />
      </PageSurface>
    </PageFrame>
  );
}
