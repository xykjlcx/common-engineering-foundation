import { CreateMenuSchema, UpdateMenuSchema, DeleteMenuSchema } from '@keel/core/menu-contract';
import { isDemoBuild } from '@/config/env';
import { queryOptions } from '@tanstack/react-query';

import { manifests } from '@/modules/registry';
import { rpc } from '@/lib/rpc/client';
import { demoMenu } from '../mocks/demo-menu';
import { menuKeys } from './keys';
import {
  MenuRecordSchema,
  MenuCustomizationSchema,
  RuntimeMenuCreateSchema,
  type CreateMenuInput,
  type SetMenuVisibilityInput,
  type UpdateMenuInput,
} from './schema';

const client = () => (isDemoBuild ? demoMenu : rpc.menu);
type MenuNode = Awaited<ReturnType<typeof rpc.menu.tree>>['nodes'][number];
function menuView(row: Omit<MenuNode, 'children'>) {
  return MenuRecordSchema.parse({
    ...row,
    icon: row.icon ?? undefined,
    path: row.path ?? undefined,
    permission: row.permCode ?? undefined,
  });
}
function flatten(nodes: MenuNode[]): Omit<MenuNode, 'children'>[] {
  return nodes.flatMap(({ children, ...row }) => [row, ...flatten(children)]);
}

export const navigationQuery = queryOptions({
  queryKey: menuKeys.navigation(),
  staleTime: 5 * 60_000,
  queryFn: ({ signal }) => client().navigation({}, { signal }),
});
export const subsystemsQuery = queryOptions({
  ...navigationQuery,
  select: (navigation) => {
    const available = new Set(navigation.map((row) => row.subsystemKey));
    return manifests
      .map((manifest) => manifest.subsystem)
      .filter((subsystem) => subsystem.key === 'admin' || available.has(subsystem.key));
  },
});
export const menusQuery = (subsystem: string) =>
  queryOptions({
    ...navigationQuery,
    select: (navigation) => navigation.filter((row) => row.subsystemKey === subsystem).map(menuView),
  });
export const managedMenusQuery = (subsystem: string) =>
  queryOptions({
    queryKey: menuKeys.management(subsystem),
    queryFn: async ({ signal }) =>
      flatten((await client().tree({}, { signal })).nodes)
        .filter((row) => row.subsystemKey === subsystem)
        .map(menuView),
  });
export const menuApi = {
  createMenu: async (dto: CreateMenuInput) => {
    const input = RuntimeMenuCreateSchema.parse({
      type: dto.type,
      subsystemKey: dto.subsystemKey,
      parentId: dto.parentId,
      label: dto.label,
      icon: dto.icon,
      shortLabel: dto.shortLabel,
      visible: dto.visible,
      sort: dto.sort,
    });
    return menuView(
      await client().create(
        CreateMenuSchema.parse({
          type: 'dir',
          subsystemKey: input.subsystemKey,
          parentId: input.parentId,
          label: input.label,
          icon: input.icon,
          visible: input.visible,
          sort: input.sort,
        }),
      ),
    );
  },
  updateMenu: async (id: string, dto: UpdateMenuInput, version: number) => {
    const input = MenuCustomizationSchema.parse({
      type: dto.type,
      parentId: dto.parentId,
      label: dto.label,
      icon: dto.icon,
      visible: dto.visible,
      sort: dto.sort,
    });
    return menuView(
      await client().update(
        UpdateMenuSchema.parse({
          id,
          version,
          parentId: input.parentId,
          label: input.label,
          icon: input.icon ?? null,
          visible: input.visible,
          sort: input.sort,
        }),
      ),
    );
  },
  deleteMenu: async ({ id, version }: { id: string; version: number }): Promise<void> => {
    await client().delete(DeleteMenuSchema.parse({ id, version }));
  },
  setMenuVisibility: async (id: string, dto: SetMenuVisibilityInput, version: number) => {
    return menuView(await client().update(UpdateMenuSchema.parse({ id, version, visible: dto.visible })));
  },
};
