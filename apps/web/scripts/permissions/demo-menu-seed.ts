import { uuidv5 } from '@keel/core/kernel/idgen';
import type { MenuDeclaration, PermissionDeclaration } from './extract.ts';

export type DemoMenuRecord = {
  id: string;
  parentId: string | null;
  subsystemKey: string;
  type: 'dir' | 'menu' | 'action';
  label: Record<string, string>;
  icon?: string;
  path?: string;
  permission?: string;
  visible: boolean;
  sort: number;
  origin: 'catalog';
  runtimeManaged: false;
};

export type CatalogLabelLookup = (labelKey: string, subsystemKey: string) => Record<string, string>;

function catalogId(sourceKey: string): string {
  return uuidv5(`menu:catalog:${sourceKey}`);
}

export function buildDemoMenuSeed(
  menus: readonly MenuDeclaration[],
  permissions: readonly PermissionDeclaration[],
  labelFor: CatalogLabelLookup,
): Record<string, DemoMenuRecord[]> {
  const records: DemoMenuRecord[] = [];
  const bySubsystem = new Map<string, DemoMenuRecord[]>();
  for (const menu of menus) {
    const record: DemoMenuRecord = {
      id: catalogId(menu.sourceKey),
      parentId: menu.parentSourceKey === null ? null : catalogId(menu.parentSourceKey),
      subsystemKey: menu.subsystemKey,
      type: menu.type,
      label: labelFor(menu.labelKey, menu.subsystemKey),
      visible: menu.visible,
      sort: menu.sort,
      origin: 'catalog',
      runtimeManaged: false,
      ...(menu.icon ? { icon: menu.icon } : {}),
      ...(menu.path ? { path: menu.path } : {}),
      ...(menu.permission ? { permission: menu.permission } : {}),
    };
    records.push(record);
    const list = bySubsystem.get(menu.subsystemKey) ?? [];
    list.push(record);
    bySubsystem.set(menu.subsystemKey, list);
  }
  const actionSort = new Map<string, number>();
  for (const permission of permissions) {
    if (permission.kind !== 'ACTION' || !permission.labelKey) continue;
    const parentKey = `${permission.routeId}#page`;
    const parent = records.find((item) => item.id === catalogId(parentKey));
    if (!parent) throw new Error(`demo action missing page: ${permission.sourceKey}`);
    const next = (actionSort.get(parent.id) ?? 0) + 1;
    actionSort.set(parent.id, next);
    const record: DemoMenuRecord = {
      id: catalogId(permission.sourceKey),
      parentId: parent.id,
      subsystemKey: parent.subsystemKey,
      type: 'action',
      label: labelFor(permission.labelKey, parent.subsystemKey),
      visible: true,
      sort: next,
      origin: 'catalog',
      runtimeManaged: false,
      permission: permission.code,
    };
    const list = bySubsystem.get(parent.subsystemKey) ?? [];
    list.push(record);
    bySubsystem.set(parent.subsystemKey, list);
  }
  return Object.fromEntries([...bySubsystem.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function renderDemoMenuSeedModule(seed: Record<string, DemoMenuRecord[]>): string {
  return `import type { MenuRecord } from './types';

export const demoMenuSeedBySubsystem: Record<string, MenuRecord[]> = ${JSON.stringify(seed, null, 2)};
`;
}
