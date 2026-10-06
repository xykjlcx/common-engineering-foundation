import { useMemo, useState } from 'react';
import { ChevronsDown, ChevronsUp, PanelRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  PageFrame,
  PagePane,
  PagePaneBody,
  PagePaneHeader,
  PagePaneToolbar,
  PageSurface,
} from '@/components/pro/page-scaffold';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { SelectControl } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { lv } from '@/lib/localized';
import { matchPermission } from '@/lib/permission';
import { MenuInspector } from '../detail/MenuInspector';
import { MenuOverlays } from './MenuOverlays';
import { MenuTree } from './MenuTree';
import { SubsystemSheet, type SubsystemPanelProps } from './SubsystemPanel';
import { buildManagedMenuRows, collapsibleMenuIds, hasMenuChildren } from '../model';
import {
  type CreateMenuInput,
  type CreateSubsystemInput,
  type UpdateMenuInput,
  type UpdateSubsystemInput,
  type ManagedMenuRecord,
} from '../api';
import type { MenuCapabilities, MenuOverlay } from '../types';
import type { MenuRecord, Subsystem } from '@/modules/types';

export interface MenusViewProps {
  permissions: string[];
  systemAdmin?: boolean;
  subsystems: Subsystem[];
  activeSubsystemKey: string;
  menus: ManagedMenuRecord[];
  refreshing?: boolean;
  catalogManaged?: boolean;
  onActiveSubsystemChange: (key: string) => void;
  onCreateSubsystem?: (dto: CreateSubsystemInput) => void | Promise<void>;
  onCreateMenu: (dto: CreateMenuInput) => void | Promise<void>;
  onUpdateMenu: (id: string, dto: UpdateMenuInput, version: number) => void | Promise<void>;
  onUpdateSubsystem?: (key: string, dto: UpdateSubsystemInput) => void | Promise<void>;
  onDeleteMenu: (id: string, version: number) => void | Promise<void>;
  onSetMenuVisibility: (id: string, visible: boolean, version: number) => void | Promise<void>;
}

export function MenusView({
  permissions,
  systemAdmin = false,
  subsystems,
  activeSubsystemKey,
  menus,
  refreshing = false,
  catalogManaged = false,
  onActiveSubsystemChange,
  onCreateSubsystem,
  onCreateMenu,
  onUpdateMenu,
  onUpdateSubsystem,
  onDeleteMenu,
  onSetMenuVisibility,
}: MenusViewProps) {
  const { t, i18n } = useTranslation('admin');
  const locale = i18n.language;
  const [keyword, setKeyword] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [subsystemOpen, setSubsystemOpen] = useState(false);
  const [overlay, setOverlay] = useState<MenuOverlay>({ kind: 'none' });

  const activeSubsystem =
    subsystems.find((subsystem) => subsystem.key === activeSubsystemKey) ?? subsystems[0];
  const activeKey = activeSubsystem?.key ?? activeSubsystemKey;
  const navigationMenus = useMemo(() => menus.filter((menu) => menu.type !== 'action'), [menus]);
  const rows = useMemo(
    () => buildManagedMenuRows(menus, collapsedIds, locale, keyword),
    [collapsedIds, keyword, locale, menus],
  );
  const collapsibleIds = useMemo(() => collapsibleMenuIds(navigationMenus), [navigationMenus]);
  const allMenusCollapsed =
    collapsibleIds.length > 0 && collapsibleIds.every((id) => collapsedIds.includes(id));
  const selectedMenu =
    rows.find((row) => row.menu.id === selectedMenuId)?.menu ??
    rows.find((row) => !row.hiddenByCollapse)?.menu ??
    navigationMenus[0] ??
    null;
  const selectedParent = selectedMenu?.parentId
    ? (menus.find((menu) => menu.id === selectedMenu.parentId) ?? null)
    : null;
  const selectedActions = useMemo(
    () =>
      selectedMenu?.type === 'menu'
        ? menus
            .filter((menu) => menu.type === 'action' && menu.parentId === selectedMenu.id)
            .toSorted((a, b) => a.sort - b.sort)
        : [],
    [menus, selectedMenu],
  );
  const capabilities: MenuCapabilities = {
    create: matchPermission({ permissions, systemAdmin }, 'iam:menu:create'),
    update: matchPermission({ permissions, systemAdmin }, 'iam:menu:update'),
    delete: matchPermission({ permissions, systemAdmin }, 'iam:menu:del'),
    toggle: matchPermission({ permissions, systemAdmin }, 'iam:menu:update'),
  };
  const subsystemCapabilities: MenuCapabilities = {
    ...capabilities,
    create: capabilities.create && !!onCreateSubsystem,
    update: capabilities.update && !!onUpdateSubsystem,
  };
  const nestedMenuCapabilities: MenuCapabilities = {
    ...capabilities,
    create: catalogManaged ? false : capabilities.create,
    delete: capabilities.delete && (!catalogManaged || selectedMenu?.runtimeManaged === true),
  };

  const selectSubsystem = (key: string) => {
    setKeyword('');
    setCollapsedIds([]);
    setSelectedMenuId(null);
    onActiveSubsystemChange(key);
  };
  const openCreateSubsystem = () => setOverlay({ kind: 'subsystem-form', state: { mode: 'create' } });
  const openEditSubsystem = (subsystem: Subsystem) =>
    setOverlay({ kind: 'subsystem-form', state: { mode: 'edit', subsystem } });
  const subsystemPanelProps: SubsystemPanelProps = {
    subsystems,
    activeKey,
    locale,
    t,
    capabilities: subsystemCapabilities,
    onSelect: selectSubsystem,
    onCreate: openCreateSubsystem,
    onEdit: openEditSubsystem,
  };
  const toggleNode = (id: string) => {
    setCollapsedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };
  const createChild = (menu: MenuRecord) =>
    setOverlay({ kind: 'menu-form', state: { mode: 'create', parentId: menu.id, type: 'menu' } });
  const createAction = (menu: MenuRecord) =>
    setOverlay({ kind: 'menu-form', state: { mode: 'create', parentId: menu.id, type: 'action' } });
  const editMenu = (menu: MenuRecord) => {
    const snapshot = menus.find((candidate) => candidate.id === menu.id);
    if (snapshot) setOverlay({ kind: 'menu-form', state: { mode: 'edit', menu: snapshot } });
  };
  const deleteMenu = (menu: MenuRecord) => {
    const snapshot = menus.find((candidate) => candidate.id === menu.id);
    if (snapshot) setOverlay({ kind: 'delete', menu: snapshot });
  };
  const submitMenu = async (dto: UpdateMenuInput) => {
    if (overlay.kind !== 'menu-form') return;
    if (overlay.state.mode === 'create' ? !capabilities.create : !capabilities.update) return;

    try {
      if (overlay.state.mode === 'create') {
        if (catalogManaged && (dto.type !== 'dir' || dto.parentId !== null)) return;
        await onCreateMenu({ subsystemKey: activeKey, ...dto });
      } else {
        await onUpdateMenu(overlay.state.menu.id, dto, overlay.state.menu.version);
      }
    } catch {
      return;
    }
    setOverlay({ kind: 'none' });
  };
  const submitSubsystem = async (
    payload:
      | { mode: 'create'; dto: CreateSubsystemInput }
      | { mode: 'edit'; key: string; dto: UpdateSubsystemInput },
  ) => {
    if (payload.mode === 'create' ? !subsystemCapabilities.create : !subsystemCapabilities.update) return;
    try {
      if (payload.mode === 'create') await onCreateSubsystem?.(payload.dto);
      else await onUpdateSubsystem?.(payload.key, payload.dto);
    } catch {
      return;
    }
    setOverlay({ kind: 'none' });
  };
  const confirmDelete = async () => {
    if (
      overlay.kind !== 'delete' ||
      !capabilities.delete ||
      (catalogManaged && overlay.menu.runtimeManaged !== true)
    )
      return;
    try {
      await onDeleteMenu(overlay.menu.id, overlay.menu.version);
    } catch {
      return;
    }
    setOverlay({ kind: 'none' });
  };
  const setVisibility = (id: string, visible: boolean) => {
    if (!capabilities.toggle) return;
    const menu = menus.find((candidate) => candidate.id === id);
    if (!menu) return;
    void Promise.resolve(onSetMenuVisibility(id, visible, menu.version)).catch(() => undefined);
  };
  const inspector = (closeSheet?: () => void) => (
    <MenuInspector
      menu={selectedMenu}
      parent={selectedParent}
      hasChildren={selectedMenu ? hasMenuChildren(menus, selectedMenu.id) : false}
      actions={selectedActions}
      locale={locale}
      t={t}
      capabilities={nestedMenuCapabilities}
      onCreateAction={(menu) => {
        createAction(menu);
        closeSheet?.();
      }}
      onEdit={(menu) => {
        editMenu(menu);
        closeSheet?.();
      }}
      onDelete={(menu) => {
        deleteMenu(menu);
        closeSheet?.();
      }}
      onSetVisibility={setVisibility}
    />
  );

  return (
    <PageFrame breadcrumbs={[{ label: t('menus.breadcrumbGroup') }, { label: t('menus.title') }]}>
      <PageSurface data-testid="menu-management-surface" className="min-h-0 flex-1">
        <PagePaneHeader
          title={t('menus.title')}
          meta={`${t('menus.treeSummary', { count: navigationMenus.length })}${refreshing ? ` · ${t('menus.refreshing')}` : ''}`}
          actions={
            <>
              <SelectControl
                aria-label={t('menus.subsystems.selector')}
                value={activeKey}
                options={subsystems.map((subsystem) => ({
                  value: subsystem.key,
                  label: lv(subsystem.label, locale),
                }))}
                onValueChange={selectSubsystem}
                className="w-40"
                size="sm"
              />
              <Button variant="outline" size="sm" onClick={() => setSubsystemOpen(true)}>
                {t('menus.actions.viewSubsystems')}
              </Button>
              {capabilities.create && (
                <Button
                  size="sm"
                  onClick={() =>
                    setOverlay({ kind: 'menu-form', state: { mode: 'create', parentId: null, type: 'dir' } })
                  }
                >
                  <Plus data-icon="inline-start" />
                  {t(catalogManaged ? 'menus.actions.createDirectory' : 'menus.actions.create')}
                </Button>
              )}
            </>
          }
        />
        <div
          role="region"
          aria-label={t('menus.workspaceLabel')}
          className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,5fr)]"
        >
          <PagePane
            variant="master"
            aria-label={t('menus.treeRegionLabel', {
              subsystem: activeSubsystem ? lv(activeSubsystem.label, locale) : '-',
            })}
          >
            <PagePaneToolbar className="flex items-center gap-2">
              <SearchField
                aria-label={t('menus.searchLabel')}
                value={keyword}
                placeholder={t('menus.searchPlaceholder')}
                onChange={(event) => setKeyword(event.currentTarget.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="xl:hidden"
                onClick={() => setInspectorOpen(true)}
              >
                <PanelRight data-icon="inline-start" />
                {t('menus.actions.inspect')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={collapsibleIds.length === 0}
                onClick={() => setCollapsedIds(allMenusCollapsed ? [] : collapsibleIds)}
              >
                {allMenusCollapsed ? (
                  <ChevronsDown data-icon="inline-start" />
                ) : (
                  <ChevronsUp data-icon="inline-start" />
                )}
                {t(allMenusCollapsed ? 'menus.actions.expand' : 'menus.actions.collapse')}
              </Button>{' '}
            </PagePaneToolbar>
            <PagePaneBody>
              <MenuTree
                rows={rows}
                collapsedIds={collapsedIds}
                selectedMenuId={selectedMenu?.id ?? null}
                locale={locale}
                t={t}
                canCreate={nestedMenuCapabilities.create}
                onSelect={(menu) => setSelectedMenuId(menu.id)}
                onAddChild={createChild}
                onToggleCollapse={toggleNode}
              />
            </PagePaneBody>
          </PagePane>

          <PagePane
            variant="detail"
            role="complementary"
            aria-label={t('menus.inspector.label')}
            className="hidden xl:flex"
          >
            <PagePaneBody tone="canvas">{inspector()}</PagePaneBody>
          </PagePane>
        </div>
      </PageSurface>

      <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <SheetContent side="right" className="gap-0 overflow-y-auto">
          <SheetTitle className="sr-only">{t('menus.inspector.title')}</SheetTitle>
          <PagePaneHeader title={t('menus.inspector.title')} />
          <PagePaneBody tone="canvas">{inspector(() => setInspectorOpen(false))}</PagePaneBody>
        </SheetContent>
      </Sheet>

      <SubsystemSheet {...subsystemPanelProps} open={subsystemOpen} onOpenChange={setSubsystemOpen} />

      <MenuOverlays
        codeOwnedLocked={catalogManaged}
        overlay={overlay}
        activeSubsystemKey={activeKey}
        menus={menus}
        subsystems={subsystems}
        locale={locale}
        t={t}
        onClose={() => setOverlay({ kind: 'none' })}
        onSubmitMenu={submitMenu}
        onSubmitSubsystem={submitSubsystem}
        onConfirmDelete={confirmDelete}
      />
    </PageFrame>
  );
}
