import { PERMISSION_CODE_PATTERN } from '@keel/core/kernel/permission-code';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDemoMenuSeed, renderDemoMenuSeedModule } from './demo-menu-seed.ts';
import {
  extractRouteSource,
  validateDeclarations,
  type PermissionDeclaration,
  type MenuDeclaration,
  type PermissionReference,
} from './extract.ts';
import { loadAndValidateWiring, moduleKeyFromRouteId } from './wiring.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const routesRoot = join(root, 'apps/web/src/routes');
const modulesRoot = join(root, 'apps/web/src/modules');
const outputRoot = join(root, 'apps/web/scripts/permissions/generated');
const demoSeedModule = join(root, 'apps/web/src/modules/demo-menu-seed.generated.ts');
const menuManifest = join(root, 'apps/web/scripts/permissions/menu-manifest.json');
const aliasManifest = join(root, 'apps/web/scripts/permissions/permission-aliases.json');
const retiredManifest = join(root, 'apps/web/scripts/permissions/permission-retired.json');
const wiringManifest = join(root, 'apps/web/scripts/permissions/wiring.json');
type AliasDeclaration = { sourceKey: string; oldCode: string; newCode: string };
type RetiredDeclaration = { sourceKey: string; reason: string };
const permissionCode = PERMISSION_CODE_PATTERN;

export function applyAliases(permissions: PermissionDeclaration[], aliases: AliasDeclaration[]): void {
  const bySource = new Map(permissions.map((item) => [item.sourceKey, item]));
  const oldCodes = new Set<string>();
  for (const alias of aliases) {
    if (!permissionCode.test(alias.oldCode) || !permissionCode.test(alias.newCode))
      throw new Error(`alias permission code 非法: ${alias.oldCode}`);
    if (oldCodes.has(alias.oldCode)) throw new Error(`重复 alias oldCode: ${alias.oldCode}`);
    oldCodes.add(alias.oldCode);
    const target = bySource.get(alias.sourceKey);
    if (!target) throw new Error(`alias sourceKey 未声明: ${alias.sourceKey}`);
    if (target.code !== alias.newCode) throw new Error(`alias newCode 未匹配当前声明: ${alias.sourceKey}`);
    if (alias.oldCode === alias.newCode) throw new Error(`alias oldCode 与 newCode 相同: ${alias.oldCode}`);
    target.aliases = [...(target.aliases ?? []), alias.oldCode].sort();
  }
}

export function validateMenuDag(menus: MenuDeclaration[]): void {
  const bySource = new Map(menus.map((item) => [item.sourceKey, item]));
  const done = new Set<string>();
  const visiting = new Set<string>();
  const visit = (key: string) => {
    if (done.has(key)) return;
    if (visiting.has(key)) throw new Error(`menu parent cycle: ${key}`);
    visiting.add(key);
    const parent = bySource.get(key)?.parentSourceKey;
    if (parent !== null && parent !== undefined) {
      if (!bySource.has(parent)) throw new Error(`menu parent 不存在: ${key}`);
      visit(parent);
    }
    visiting.delete(key);
    done.add(key);
  };
  for (const key of bySource.keys()) visit(key);
}

export function parseRetiredDocument(input: unknown): RetiredDeclaration[] {
  if (!isRecord(input) || input.version !== 1 || !Array.isArray(input.items)) {
    throw new Error('permission retired manifest root schema 非法');
  }
  const items: RetiredDeclaration[] = [];
  const seen = new Set<string>();
  for (const raw of input.items) {
    if (!isRecord(raw) || Object.keys(raw).sort().join(',') !== 'reason,sourceKey') {
      throw new Error('permission retired manifest item schema 非法');
    }
    if (
      typeof raw.sourceKey !== 'string' ||
      typeof raw.reason !== 'string' ||
      raw.reason.trim().length === 0
    ) {
      throw new Error('permission retired manifest required field 非法');
    }
    if (seen.has(raw.sourceKey)) throw new Error(`重复 retired sourceKey: ${raw.sourceKey}`);
    seen.add(raw.sourceKey);
    items.push({ sourceKey: raw.sourceKey, reason: raw.reason });
  }
  return items;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.name.startsWith('-')) return [];
      return entry.isDirectory()
        ? filesUnder(path)
        : /\.tsx?$/.test(entry.name) && entry.name !== '__root.tsx'
          ? [path]
          : [];
    }),
  );
  return files.flat().sort();
}

function document<T>(items: T[]) {
  const body = { version: 1, items };
  const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  return `${JSON.stringify({ ...body, digest }, null, 2)}\n`;
}

function textAt(value: unknown, keys: readonly string[]): string | undefined {
  let current = value;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, key)) return undefined;
    current = Reflect.get(current, key);
  }
  return typeof current === 'string' && current.trim() ? current : undefined;
}

async function loadCatalogLabels(nodes: readonly { subsystemKey: string; labelKey: string }[]) {
  const files = new Map<string, unknown>();
  const labels = new Map<string, Record<string, string>>();
  for (const node of nodes) {
    const label: Record<string, string> = {};
    for (const locale of ['zh-CN', 'en-US'] as const) {
      const keys = node.labelKey.split('.');
      const business = keys[0];
      if (!business || !/^[a-z][a-zA-Z0-9-]*$/.test(business))
        throw new Error(`invalid label key: ${node.labelKey}`);
      const path =
        node.subsystemKey === 'admin'
          ? resolve(root, `apps/web/src/locales/${locale}/admin/${business}.json`)
          : resolve(root, `apps/web/src/locales/${locale}/${node.subsystemKey}.json`);
      if (!files.has(path)) files.set(path, JSON.parse(await readFile(path, 'utf8')));
      const text = textAt(files.get(path), node.subsystemKey === 'admin' ? keys.slice(1) : keys);
      if (!text)
        throw new Error(`missing catalog translation: ${locale}/${node.subsystemKey}/${node.labelKey}`);
      label[locale] = text;
    }
    labels.set(`${node.subsystemKey}:${node.labelKey}`, label);
  }
  return (labelKey: string, subsystemKey: string) => {
    const label = labels.get(`${subsystemKey}:${labelKey}`);
    if (!label) throw new Error(`missing catalog label: ${subsystemKey}/${labelKey}`);
    return label;
  };
}

function assertRetiredAgainstCatalog(
  permissions: readonly PermissionDeclaration[],
  retired: readonly RetiredDeclaration[],
): void {
  const grantable = new Set(
    permissions
      .filter((item) => item.kind === 'PAGE' || item.superuserOnly !== true)
      .map((item) => item.sourceKey),
  );
  const declared = new Map(permissions.map((item) => [item.sourceKey, item]));
  for (const item of retired) {
    if (grantable.has(item.sourceKey)) throw new Error(`retired identity still grantable: ${item.sourceKey}`);
    const current = declared.get(item.sourceKey);
    if (current && current.kind !== 'ACTION')
      throw new Error(`retired identity is not action: ${item.sourceKey}`);
    if (!item.sourceKey.includes('#action:'))
      throw new Error(`retired identity is not action: ${item.sourceKey}`);
  }
}

export async function generateDocuments(routeFiles?: string[]) {
  const sources = routeFiles ?? (await filesUnder(routesRoot));
  const permissions: PermissionDeclaration[] = [];
  const menus: MenuDeclaration[] = [];
  const references: PermissionReference[] = [];
  const routeIds = new Set<string>();
  const authenticatedRoutes = new Set<string>();
  for (const file of sources) {
    const result = extractRouteSource(relative(root, file), await readFile(file, 'utf8'));
    if (routeIds.has(result.routeId)) throw new Error(`重复 routeId: ${result.routeId}`);
    routeIds.add(result.routeId);
    permissions.push(...result.permissions);
    references.push(...result.references);
    if (result.access === 'authenticated') authenticatedRoutes.add(result.routeId);
  }
  permissions.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  validateDeclarations(permissions);
  const aliasDocument = JSON.parse(await readFile(aliasManifest, 'utf8')) as {
    version?: unknown;
    items?: unknown;
  };
  if (
    !aliasDocument ||
    aliasDocument.version !== 1 ||
    !Array.isArray(aliasDocument.items) ||
    Object.keys(aliasDocument).sort().join(',') !== 'items,version'
  )
    throw new Error('permission alias manifest root schema 非法');
  const aliasKeys = 'newCode,oldCode,sourceKey';
  // Array.isArray 只把 unknown 收窄到 any[]，元素退化成 any；显式接成 unknown[] 才逼后面逐个收窄。
  const aliasItems: unknown[] = aliasDocument.items;
  for (const raw of aliasItems)
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      Object.keys(raw).sort().join(',') !== aliasKeys
    )
      throw new Error('permission alias manifest item schema 非法');
  // 上面逐条校验过 key 集合就是 sourceKey/oldCode/newCode，这里按声明重建对象，
  // 让类型来自实际读到的字段而不是一句 as——as 断言在 manifest 结构漂移时不会报错。
  const aliases: AliasDeclaration[] = aliasItems.map((raw) => {
    const item = raw as Record<string, unknown>;
    const sourceKey = item.sourceKey;
    const oldCode = item.oldCode;
    const newCode = item.newCode;
    if (typeof sourceKey !== 'string' || typeof oldCode !== 'string' || typeof newCode !== 'string')
      throw new Error('permission alias manifest item schema 非法');
    return { sourceKey, oldCode, newCode };
  });
  applyAliases(permissions, aliases);
  const declared = new Set(permissions.map((item) => item.code));
  const pageCodeBySource = new Map(
    permissions.filter((item) => item.kind === 'PAGE').map((item) => [item.sourceKey, item.code]),
  );
  for (const reference of references) {
    if (!declared.has(reference.code))
      throw new Error(`permissionRef 未声明: ${reference.code} (${reference.routeId})`);
  }
  const wiringInput: unknown = JSON.parse(await readFile(wiringManifest, 'utf8'));
  await loadAndValidateWiring({ wiringInput, modulesRoot });
  const retired = parseRetiredDocument(JSON.parse(await readFile(retiredManifest, 'utf8')));
  const manifest = JSON.parse(await readFile(menuManifest, 'utf8')) as unknown;
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
    throw new Error('menu manifest 必须是对象');
  const rootKeys = Object.keys(manifest).sort().join(',');
  if (
    rootKeys !== 'items,version' ||
    Reflect.get(manifest, 'version') !== 1 ||
    !Array.isArray(Reflect.get(manifest, 'items'))
  ) {
    throw new Error('menu manifest root schema 非法');
  }
  const menuKeys = [
    'icon',
    'labelKey',
    'parentSourceKey',
    'path',
    'permission',
    'routeKey',
    'sort',
    'sourceKey',
    'subsystemKey',
    'type',
    'visible',
  ]
    .sort()
    .join(',');
  const pageSources = new Set(
    permissions.filter((item) => item.kind === 'PAGE').map((item) => item.sourceKey),
  );
  for (const raw of Reflect.get(manifest, 'items') as unknown[]) {
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      Object.keys(raw).sort().join(',') !== menuKeys
    )
      throw new Error('menu manifest item schema 非法');
    const item = raw as MenuDeclaration;
    if (
      typeof item.sourceKey !== 'string' ||
      typeof item.subsystemKey !== 'string' ||
      typeof item.labelKey !== 'string' ||
      typeof item.sort !== 'number' ||
      !Number.isInteger(item.sort) ||
      typeof item.visible !== 'boolean' ||
      (item.icon !== null && typeof item.icon !== 'string') ||
      (item.parentSourceKey !== null && typeof item.parentSourceKey !== 'string')
    ) {
      throw new Error(`menu manifest required field 非法: ${String(item.sourceKey)}`);
    }
    if (item.type === 'menu') {
      if (typeof item.routeKey !== 'string' || typeof item.path !== 'string')
        throw new Error(`可导航菜单字段不完整: ${item.sourceKey}`);
      if (item.permission === null) {
        if (!authenticatedRoutes.has(item.routeKey) || pageSources.has(item.sourceKey)) {
          throw new Error(`authenticated 菜单必须对应无 permission 的 access 路由: ${item.sourceKey}`);
        }
      } else if (typeof item.permission !== 'string') {
        throw new Error(`可导航菜单字段不完整: ${item.sourceKey}`);
      } else if (
        !pageSources.has(item.sourceKey) ||
        !declared.has(item.permission) ||
        pageCodeBySource.get(item.sourceKey) !== item.permission
      ) {
        throw new Error(`菜单 sourceKey/code 未精确匹配 catalog page: ${item.sourceKey}`);
      }
    } else if (item.type === 'dir') {
      if (item.routeKey !== null || item.path !== null || item.permission !== null)
        throw new Error(`display-only 目录不得可导航: ${item.sourceKey}`);
    } else throw new Error(`非法 menu type: ${String(item.type)}`);
    menus.push(item);
  }
  const menuSources = new Set(menus.map((item) => item.sourceKey));
  if (menuSources.size !== menus.length) throw new Error('重复 menu sourceKey');
  for (const item of menus)
    if (item.parentSourceKey !== null && !menuSources.has(item.parentSourceKey))
      throw new Error(`menu parent 不存在: ${item.sourceKey}`);
  validateMenuDag(menus);
  for (const sourceKey of pageSources)
    if (!menuSources.has(sourceKey)) throw new Error(`page permission 缺 menu metadata: ${sourceKey}`);
  for (const routeId of authenticatedRoutes) {
    const sourceKey = `${routeId}#page`;
    const menu = menus.find((item) => item.sourceKey === sourceKey);
    if (!menu || menu.type !== 'menu' || menu.permission !== null) {
      throw new Error(`access: authenticated 缺 permCode=null 的菜单: ${routeId}`);
    }
  }
  assertRetiredAgainstCatalog(permissions, retired);
  for (const permission of permissions) {
    const moduleKey = moduleKeyFromRouteId(permission.routeId);
    if (!moduleKey) throw new Error(`权限声明无法映射到业务模块: ${permission.sourceKey}`);
  }
  const labelNodes = [
    ...menus.map((item) => ({ subsystemKey: item.subsystemKey, labelKey: item.labelKey })),
    ...permissions.flatMap((item) => {
      if (item.kind !== 'ACTION' || !item.labelKey) return [];
      const parent = menus.find((menu) => menu.sourceKey === `${item.routeId}#page`);
      if (!parent) throw new Error(`action missing page: ${item.sourceKey}`);
      return [{ subsystemKey: parent.subsystemKey, labelKey: item.labelKey }];
    }),
  ];
  const labelFor = await loadCatalogLabels(labelNodes);
  const demoSeed = buildDemoMenuSeed(menus, permissions, labelFor);
  menus.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  return {
    'permission-catalog.json': document(permissions),
    'menu-seed.json': document(menus),
    'permission-retired.json': document(retired),
    'demo-menu-seed.generated.ts': renderDemoMenuSeedModule(demoSeed),
  };
}

async function run(mode: string) {
  if (mode !== 'generate' && mode !== 'check') throw new Error('usage: generate.ts <generate|check>');
  const documents = await generateDocuments();
  const jsonNames = ['permission-catalog.json', 'menu-seed.json', 'permission-retired.json'] as const;
  const target = mode === 'generate' ? outputRoot : await mkdtemp(join(tmpdir(), 'metabuilder-permissions-'));
  await mkdir(target, { recursive: true });
  for (const name of jsonNames) await writeFile(join(target, name), documents[name]);
  if (mode === 'generate') await writeFile(demoSeedModule, documents['demo-menu-seed.generated.ts']);
  if (mode === 'check') {
    for (const name of jsonNames) {
      const committed = await readFile(join(outputRoot, name), 'utf8').catch(() => '');
      if (committed !== documents[name]) throw new Error(`permission artifact drift: ${name}`);
    }
    const committedSeed = await readFile(demoSeedModule, 'utf8').catch(() => '');
    if (committedSeed !== documents['demo-menu-seed.generated.ts']) {
      throw new Error('permission artifact drift: demo-menu-seed.generated.ts');
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run(process.argv[2] ?? '');
}
