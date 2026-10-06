import type { Clock } from '../kernel/clock.js';
import type { Db } from '../kernel/context.js';
import {
  seedPermissionCatalog as seedMenuCatalog,
  type CatalogLabels,
} from '../modules/menu/domain/catalog-seed.js';
import { removeGrantsForRetiredMenu } from '../modules/role/api.js';

/** 维护装配负责跨模块协作；实际删除共享目录同步的同一事务。 */
export function seedPermissionCatalog(
  db: Db,
  clock: Clock,
  permissionInput: unknown,
  menuInput: unknown,
  labelFor: CatalogLabels,
  retiredInput?: unknown,
) {
  return seedMenuCatalog(
    db,
    clock,
    permissionInput,
    menuInput,
    labelFor,
    retiredInput,
    removeGrantsForRetiredMenu,
  );
}
