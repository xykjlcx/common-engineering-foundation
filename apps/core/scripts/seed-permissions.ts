import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EnvConfigError, loadEnv, type Env } from '../src/env.js';
import { initDb } from '../src/kernel/db.js';
import { collectDeclaredBusinessPerms, collectDeclaredCapabilities } from '../src/kernel/procedures.js';
import { router } from '../src/router.js';
import { comparePermissionCatalog, readPermissionCatalog } from '../src/modules/menu/domain/catalog-seed.js';
import { seedPermissionCatalog } from '../src/maintenance/permission-catalog.js';
import {
  adjudicatePermissionCatalog,
  formatAdjudicationFailure,
} from '../src/modules/menu/domain/permission-adjudication.js';
import { parseWiringDocument } from '../src/modules/menu/domain/permission-wiring.js';

const USAGE = 'usage: seed-permissions.ts [--check] [--catalog-dir DIR] [--locales-dir DIR] [--wiring PATH]';
const MONOREPO_ROOT = resolve(import.meta.dirname, '../../..');

export type PermissionSeedPaths = {
  catalogDir: string;
  localesDir: string;
  wiringPath: string;
};

export type PermissionSeedPathOptions = {
  catalogDir?: string;
  localesDir?: string;
  wiringPath?: string;
};

function firstPath(explicit: string | undefined, envValue: string | undefined): string | undefined {
  const value = explicit ?? envValue?.trim();
  return value || undefined;
}

/** 覆盖 catalog 时默认读该目录下 wiring.json，避免再回读母仓。 */
export function resolvePermissionSeedPaths(
  options: PermissionSeedPathOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): PermissionSeedPaths {
  const catalogDir =
    firstPath(options.catalogDir, env.PERMISSION_CATALOG_DIR) ??
    resolve(MONOREPO_ROOT, 'apps/web/scripts/permissions/generated');
  const localesDir =
    firstPath(options.localesDir, env.PERMISSION_LOCALES_DIR) ??
    resolve(MONOREPO_ROOT, 'apps/web/src/locales');
  const catalogOverridden = firstPath(options.catalogDir, env.PERMISSION_CATALOG_DIR) !== undefined;
  const wiringPath =
    firstPath(options.wiringPath, env.PERMISSION_WIRING_PATH) ??
    (catalogOverridden
      ? resolve(catalogDir, 'wiring.json')
      : resolve(MONOREPO_ROOT, 'apps/web/scripts/permissions/wiring.json'));
  return { catalogDir, localesDir, wiringPath };
}

export function parsePermissionSeedArgs(argv: readonly string[]): {
  check: boolean;
  options: PermissionSeedPathOptions;
} {
  const rest = argv.slice(2);
  let check = false;
  const options: PermissionSeedPathOptions = {};
  const take = (flag: string, index: number): string => {
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) throw new Error(USAGE);
    return value;
  };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === '--') continue;
    if (argument === '--check') {
      check = true;
      continue;
    }
    if (argument === '--catalog-dir') {
      options.catalogDir = take(argument, index);
      index += 1;
      continue;
    }
    if (argument === '--locales-dir') {
      options.localesDir = take(argument, index);
      index += 1;
      continue;
    }
    if (argument === '--wiring') {
      options.wiringPath = take(argument, index);
      index += 1;
      continue;
    }
    throw new Error(USAGE);
  }
  return { check, options };
}

function textAt(value: unknown, keys: readonly string[]): string | undefined {
  let current = value;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, key)) return undefined;
    current = Reflect.get(current, key);
  }
  return typeof current === 'string' && current.trim() ? current : undefined;
}

function localeFile(localesDir: string, locale: string, node: { subsystemKey: string; labelKey: string }) {
  const keys = node.labelKey.split('.');
  const business = keys[0];
  if (!business || !/^[a-z][a-zA-Z0-9-]*$/.test(business))
    throw new Error(`invalid label key: ${node.labelKey}`);
  if (node.subsystemKey === 'admin') {
    return { path: resolve(localesDir, locale, 'admin', `${business}.json`), keys: keys.slice(1) };
  }
  return { path: resolve(localesDir, locale, `${node.subsystemKey}.json`), keys };
}

async function readCatalogFile(catalogDir: string, name: string): Promise<string> {
  const path = resolve(catalogDir, name);
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(
      `权限目录产物缺失：${path}\n先运行 permissions:generate，或用 --catalog-dir / PERMISSION_CATALOG_DIR 指向已有产物目录`,
      { cause: error },
    );
  }
}

export async function loadPermissionSeed(paths: PermissionSeedPaths = resolvePermissionSeedPaths()) {
  const permissionInput: unknown = JSON.parse(
    await readCatalogFile(paths.catalogDir, 'permission-catalog.json'),
  );
  const menuInput: unknown = JSON.parse(await readCatalogFile(paths.catalogDir, 'menu-seed.json'));
  const retiredInput: unknown = JSON.parse(
    await readCatalogFile(paths.catalogDir, 'permission-retired.json'),
  );
  const wiring = parseWiringDocument(JSON.parse(await readFile(paths.wiringPath, 'utf8')));
  const catalog = readPermissionCatalog(permissionInput, menuInput);
  const labels = new Map<string, Record<string, string>>();
  const files = new Map<string, unknown>();
  for (const node of catalog.nodes) {
    const label: Record<string, string> = {};
    for (const locale of ['zh-CN', 'en-US']) {
      const file = localeFile(paths.localesDir, locale, node);
      if (!files.has(file.path)) files.set(file.path, JSON.parse(await readFile(file.path, 'utf8')));
      const text = textAt(files.get(file.path), file.keys);
      if (!text)
        throw new Error(`missing catalog translation: ${locale}/${node.subsystemKey}/${node.labelKey}`);
      label[locale] = text;
    }
    labels.set(`${node.subsystemKey}:${node.labelKey}`, label);
  }
  return {
    permissionInput,
    menuInput,
    retiredInput,
    wiring,
    catalog,
    labelFor: (key: string, subsystem: string) => {
      const label = labels.get(`${subsystem}:${key}`);
      if (!label) throw new Error(`missing catalog label: ${subsystem}/${key}`);
      return label;
    },
  };
}

export function adjudicateLoadedCatalog(seed: Awaited<ReturnType<typeof loadPermissionSeed>>) {
  return adjudicatePermissionCatalog({
    permissions: seed.catalog.permissions,
    capabilities: collectDeclaredCapabilities(router),
    wiring: seed.wiring.items,
    routerKeys: Object.keys(router),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { check, options } = parsePermissionSeedArgs(process.argv);
  const seed = await loadPermissionSeed(resolvePermissionSeedPaths(options));
  const issues = adjudicateLoadedCatalog(seed);
  const catalogDiff = comparePermissionCatalog(
    seed.catalog.permissions,
    collectDeclaredBusinessPerms(router),
  );
  const report = { issues, backendOnly: catalogDiff.backendOnly };
  if (issues.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    throw new Error(formatAdjudicationFailure(issues));
  }
  console.log(JSON.stringify(report, null, 2));
  if (!check) {
    let env: Env;
    try {
      env = loadEnv();
    } catch (error) {
      if (!(error instanceof EnvConfigError)) throw error;
      console.error(error.message);
      process.exit(1);
    }
    const handle = initDb({
      driver: env.DATABASE_DRIVER,
      ...(env.DATABASE_URL ? { databaseUrl: env.DATABASE_URL } : {}),
      ...(env.PGLITE_DATA_DIR ? { pgliteDataDir: env.PGLITE_DATA_DIR } : {}),
    });
    try {
      if (env.NODE_ENV !== 'production' && env.DATABASE_DRIVER === 'pglite') await handle.migrate();
      const result = await seedPermissionCatalog(
        handle.db,
        { now: () => new Date() },
        seed.permissionInput,
        seed.menuInput,
        seed.labelFor,
        seed.retiredInput,
      );
      console.log(JSON.stringify({ result }));
    } finally {
      await handle.close();
    }
  }
}
