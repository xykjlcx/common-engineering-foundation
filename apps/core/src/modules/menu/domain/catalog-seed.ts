import { eq, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import * as z from 'zod';
import type { Clock } from '../../../kernel/clock.js';
import type { Db, TxExec } from '../../../kernel/context.js';
import { uuidv5 } from '../../../kernel/idgen.js';
import { PERMISSION_CODE_PATTERN } from '../../../kernel/permission-code.js';
import { menus, MenuTypeSchema } from '../schema.js';
import { EMPTY_RETIRED_DOCUMENT, readRetiredCatalog, retireCatalogActions } from './catalog-retire.js';
import { assertMenuHierarchy } from './menu-rules.js';

const codeSchema = z
  .string()
  .max(128)
  .regex(PERMISSION_CODE_PATTERN)
  .refine((code) => !code.startsWith('platform:'));
const permissionSchema = z
  .object({
    sourceKey: z.string().min(1),
    code: codeSchema,
    kind: z.enum(['PAGE', 'ACTION']),
    routeId: z.string().min(1),
    labelKey: z.string().optional(),
    aliases: z.array(codeSchema).optional(),
    superuserOnly: z.literal(true).optional(),
  })
  .strict();
const menuSchema = z
  .object({
    sourceKey: z.string().min(1),
    subsystemKey: z.string().min(1),
    routeKey: z.string().nullable(),
    type: z.enum(['menu', 'dir']),
    path: z
      .string()
      .regex(/^\/(?!\/)/)
      .nullable(),
    labelKey: z.string().min(1),
    permission: codeSchema.nullable(),
    parentSourceKey: z.string().nullable(),
    icon: z.string().nullable(),
    sort: z.number().int(),
    visible: z.boolean(),
  })
  .strict();
const permissionDocument = z
  .object({ version: z.literal(1), items: z.array(permissionSchema), digest: z.string() })
  .strict();
const menuDocument = z
  .object({ version: z.literal(1), items: z.array(menuSchema), digest: z.string() })
  .strict();
export type CatalogPermission = z.infer<typeof permissionSchema>;
type CatalogNode = {
  sourceKey: string;
  subsystemKey: string;
  type: 'dir' | 'menu' | 'action';
  parentSourceKey: string | null;
  path: string | null;
  permCode: string | null;
  labelKey: string;
  icon: string | null;
  sort: number;
  visible: boolean;
  aliases: string[];
};
export type CatalogLabels = (key: string, subsystem: string) => Record<string, string>;

function verifyDigest(input: unknown) {
  const document = z
    .object({ version: z.literal(1), items: z.array(z.unknown()), digest: z.string() })
    .strict()
    .parse(input);
  const digest = createHash('sha256')
    .update(JSON.stringify({ version: document.version, items: document.items }))
    .digest('hex');
  if (digest !== document.digest) throw new Error('permission catalog digest mismatch');
}

/** 文档仅由代码生成；重复身份、错位页面、孤立动作在接触数据库之前拒绝。 */
export function readPermissionCatalog(permissionInput: unknown, menuInput: unknown) {
  verifyDigest(permissionInput);
  verifyDigest(menuInput);
  const permissions = permissionDocument.parse(permissionInput);
  const menuItems = menuDocument.parse(menuInput);
  const byCode = new Set<string>();
  const bySource = new Map<string, CatalogPermission>();
  for (const permission of permissions.items) {
    if (byCode.has(permission.code) || bySource.has(permission.sourceKey))
      throw new Error(`duplicate permission identity: ${permission.sourceKey}`);
    byCode.add(permission.code);
    bySource.set(permission.sourceKey, permission);
  }
  const nodes = new Map<string, CatalogNode>();
  for (const menu of menuItems.items) {
    if (nodes.has(menu.sourceKey)) throw new Error(`duplicate menu identity: ${menu.sourceKey}`);
    const permission = bySource.get(menu.sourceKey);
    if (menu.type === 'menu' && menu.permission === null) {
      if (permission || menu.routeKey === null || menu.path === null)
        throw new Error(`authenticated menu identity mismatch: ${menu.sourceKey}`);
    } else if (
      menu.type === 'menu' &&
      (!permission ||
        permission.kind !== 'PAGE' ||
        permission.code !== menu.permission ||
        menu.routeKey !== permission.routeId ||
        menu.path === null)
    )
      throw new Error(`menu/page identity mismatch: ${menu.sourceKey}`);
    if (menu.type === 'dir' && (menu.path !== null || menu.permission !== null || menu.routeKey !== null))
      throw new Error(`runtime directory has code identity: ${menu.sourceKey}`);
    nodes.set(menu.sourceKey, { ...menu, permCode: menu.permission, aliases: permission?.aliases ?? [] });
  }
  for (const permission of permissions.items) {
    if (permission.kind === 'PAGE') {
      if (!nodes.has(permission.sourceKey)) throw new Error(`page missing menu: ${permission.sourceKey}`);
      continue;
    }
    if (permission.superuserOnly === true) continue;
    const parent = nodes.get(`${permission.routeId}#page`);
    if (!parent) throw new Error(`action missing page: ${permission.sourceKey}`);
    if (nodes.has(permission.sourceKey))
      throw new Error(`duplicate action identity: ${permission.sourceKey}`);
    if (!permission.labelKey) throw new Error(`action missing labelKey: ${permission.sourceKey}`);
    nodes.set(permission.sourceKey, {
      sourceKey: permission.sourceKey,
      subsystemKey: parent.subsystemKey,
      type: 'action',
      parentSourceKey: parent.sourceKey,
      path: null,
      permCode: permission.code,
      labelKey: permission.labelKey,
      icon: null,
      sort: 0,
      visible: true,
      aliases: permission.aliases ?? [],
    });
  }
  for (const node of nodes.values()) {
    const parent = node.parentSourceKey === null ? null : nodes.get(node.parentSourceKey);
    if (parent === undefined) throw new Error(`catalog parent missing: ${node.sourceKey}`);
    assertMenuHierarchy(node.type, parent);
    if (parent && parent.subsystemKey !== node.subsystemKey)
      throw new Error(`catalog parent subsystem mismatch: ${node.sourceKey}`);
  }
  return {
    permissions: permissions.items,
    nodes: [...nodes.values()].sort((a, b) => a.sourceKey.localeCompare(b.sourceKey)),
  };
}

export function comparePermissionCatalog(
  permissions: readonly CatalogPermission[],
  executable: ReadonlySet<string>,
) {
  const declared = new Set(permissions.map((permission) => permission.code));
  return {
    frontendOnly: [...declared].filter((code) => !executable.has(code)).sort(),
    backendOnly: [...executable].filter((code) => !declared.has(code)).sort(),
    matched: [...declared].filter((code) => executable.has(code)).sort(),
  };
}

/** 一个目录同步是单事务：退役身份显式删除，其余不接管旧行；冲突明确失败。 */
export async function seedPermissionCatalog(
  db: Db,
  clock: Clock,
  permissionInput: unknown,
  menuInput: unknown,
  labelFor: CatalogLabels,
  retiredInput: unknown = EMPTY_RETIRED_DOCUMENT,
  removeRoleGrants: (tx: TxExec, menuId: string) => Promise<void>,
) {
  const catalog = readPermissionCatalog(permissionInput, menuInput);
  const retired = readRetiredCatalog(retiredInput);
  const labels = new Map(
    catalog.nodes.map((node) => [
      node.sourceKey,
      z
        .record(z.string(), z.string().min(1).max(64))
        .refine((value) => Object.keys(value).length > 0)
        .parse(labelFor(node.labelKey, node.subsystemKey)),
    ]),
  );
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(menus);
    const byIdentity = new Map(
      existing.flatMap((row) => (row.catalogIdentity === null ? [] : [[row.catalogIdentity, row]])),
    );
    const desired = new Set(catalog.nodes.map((node) => node.sourceKey));
    const deletedIds = await retireCatalogActions(tx, byIdentity, desired, retired, removeRoleGrants);
    const remaining = existing.filter((row) => !deletedIds.has(row.id));
    const planned = new Map(
      remaining.map((row) => [
        row.id,
        {
          id: row.id,
          type: MenuTypeSchema.parse(row.type),
          subsystemKey: row.subsystemKey,
          parentId: row.parentId,
        },
      ]),
    );
    for (const node of catalog.nodes) {
      const current = byIdentity.get(node.sourceKey);
      const id = current?.id ?? uuidv5(`menu:catalog:${node.sourceKey}`);
      const parentId = current
        ? current.parentId
        : node.parentSourceKey === null
          ? null
          : uuidv5(`menu:catalog:${node.parentSourceKey}`);
      planned.set(id, { id, type: node.type, subsystemKey: node.subsystemKey, parentId });
    }
    for (const row of planned.values()) {
      const parent = row.parentId === null ? null : planned.get(row.parentId);
      if (parent === undefined) throw new Error(`catalog parent missing after update: ${row.id}`);
      assertMenuHierarchy(row.type, parent);
      if (parent && parent.subsystemKey !== row.subsystemKey)
        throw new Error(`catalog update conflicts with display grouping: ${row.id}`);
    }
    const ordered = [...catalog.nodes].sort(
      (a, b) => ['dir', 'menu', 'action'].indexOf(a.type) - ['dir', 'menu', 'action'].indexOf(b.type),
    );
    let created = 0;
    let updated = 0;
    for (const node of ordered) {
      const current = byIdentity.get(node.sourceKey);
      const id = current?.id ?? uuidv5(`menu:catalog:${node.sourceKey}`);
      const conflict = remaining.find(
        (row) =>
          row.id !== current?.id &&
          (row.id === id || (node.permCode !== null && row.permCode === node.permCode)),
      );
      if (conflict)
        throw new Error(`catalog identity conflicts with existing menu: ${node.sourceKey} (${conflict.id})`);
      if (
        current &&
        current.permCode !== node.permCode &&
        current.permCode !== null &&
        node.permCode !== null &&
        !node.aliases.includes(current.permCode)
      )
        throw new Error(`permission rename requires explicit alias: ${node.sourceKey} (${current.permCode})`);
      const identity = {
        subsystemKey: node.subsystemKey,
        type: node.type,
        path: node.path,
        permCode: node.permCode,
      };
      if (!current) {
        await tx.insert(menus).values({
          id,
          catalogIdentity: node.sourceKey,
          parentId: node.parentSourceKey === null ? null : uuidv5(`menu:catalog:${node.parentSourceKey}`),
          ...identity,
          label: labels.get(node.sourceKey) ?? {},
          icon: node.icon,
          sort: node.sort,
          visible: node.visible,
          createdAt: clock.now(),
          updatedAt: clock.now(),
          version: 0,
        });
        created += 1;
      } else if (
        current.subsystemKey !== identity.subsystemKey ||
        current.type !== identity.type ||
        current.path !== identity.path ||
        current.permCode !== identity.permCode
      ) {
        // 展示字段与运行期分组保持原值；仅代码身份改变才推进版本。
        await tx
          .update(menus)
          .set({ ...identity, updatedAt: clock.now(), version: sql`${menus.version} + 1` })
          .where(eq(menus.id, current.id));
        updated += 1;
      }
    }
    return { created, updated, unchanged: catalog.nodes.length - created - updated };
  });
}
