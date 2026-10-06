import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { migrate as migrateNodePg } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { bigint, integer, pgSchema, text } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import * as z from 'zod';
import { assertTestDatabaseUrl } from '../env.js';

// 裸驱动不导出，业务仅通过上下文访问数据库。

export type Db = PgDatabase<PgQueryResultHKT>;

export const MIGRATIONS_FOLDER = path.resolve(import.meta.dirname, '../../drizzle');

let instance: Db | null = null;

export interface DbHandle {
  db: Db;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

export interface DbOptions {
  driver: 'postgres' | 'pglite';
  /** driver=postgres 必填 */
  databaseUrl?: string;
  /** driver=pglite 数据目录，缺省 memory://（进程内、退出即失） */
  pgliteDataDir?: string;
  /** 连接池预算（core 池 + 任务池 + 运维预留 ≤ max_connections 的 80%） */
  max?: number;
}

export function initDb(opts: DbOptions): DbHandle {
  if (instance) throw new Error('db already initialized');
  if (opts.driver === 'pglite') {
    const client = new PGlite(opts.pgliteDataDir ?? 'memory://');
    const database = drizzlePglite(client);
    instance = database;
    return {
      db: database,
      migrate: () => migratePglite(database, { migrationsFolder: MIGRATIONS_FOLDER }),
      close: async () => {
        instance = null;
        await client.close();
      },
    };
  }
  if (!opts.databaseUrl) throw new Error('driver=postgres requires databaseUrl');
  const pool = new pg.Pool({
    connectionString: opts.databaseUrl,
    max: opts.max ?? 10,
  });
  const database = drizzleNodePg(pool);
  instance = database;
  return {
    db: database,
    migrate: () => migrateNodePg(database, { migrationsFolder: MIGRATIONS_FOLDER }),
    close: async () => {
      instance = null;
      await pool.end();
    },
  };
}

/** 部署只读门禁：沿用 Drizzle 自身 SHA-256 算法，逐条核对历史，绝不迁移或修复。 */
export async function assertMigrationsCurrent(
  database: Db,
  migrationsFolder = MIGRATIONS_FOLDER,
): Promise<void> {
  const journal = z
    .object({
      entries: z
        .array(
          z.object({
            idx: z.number().int(),
            when: z.number().int(),
            tag: z.string(),
          }),
        )
        .min(1),
    })
    .parse(JSON.parse(readFileSync(path.join(migrationsFolder, 'meta/_journal.json'), 'utf8')));
  const sqlFiles = readdirSync(migrationsFolder).filter((file) => file.endsWith('.sql'));
  if (
    sqlFiles.length !== journal.entries.length ||
    journal.entries.some(
      (entry, index) =>
        entry.idx !== index ||
        !sqlFiles.includes(`${entry.tag}.sql`) ||
        (index > 0 && entry.when <= journal.entries[index - 1]!.when),
    ) ||
    new Set(journal.entries.map((entry) => entry.tag)).size !== journal.entries.length
  )
    throw new Error('migration readiness: invalid deployment journal');
  const expected = readMigrationFiles({ migrationsFolder });
  const [table] = await database
    .select({
      present: sql<boolean>`to_regclass('drizzle.__drizzle_migrations') is not null`,
    })
    .from(sql`(select 1) as migration_probe`);
  if (!table?.present) throw new Error('migration readiness: missing history');
  const historyTable = pgSchema('drizzle').table('__drizzle_migrations', {
    id: integer('id').notNull(),
    hash: text('hash').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  });
  const actual = await database.select().from(historyTable).orderBy(historyTable.id);
  if (actual.length !== expected.length) throw new Error('migration readiness: history count mismatch');
  for (const [index, migration] of expected.entries()) {
    const applied = actual[index];
    if (applied?.createdAt !== migration.folderMillis)
      throw new Error(`migration readiness: sequence mismatch at ${String(index)}`);
    if (applied.hash !== migration.hash)
      throw new Error(`migration readiness: hash mismatch at ${String(index)}`);
  }
}

/** 连接可用性探针：`select 1` 的唯一出处（存活面与就绪面共用同一条判据）。 */
export async function pingDb(database: Pick<Db, 'execute'>): Promise<void> {
  await database.execute(sql`select 1`);
}

export function coreDb(): Db {
  if (!instance) throw new Error('db not initialized: call initDb() first');
  return instance;
}

/** 每个 PG 测试栈只迁移自己新建的随机数据库；控制库和其他数据库从不清表。 */
export async function createTestPostgresDb(databaseUrl: string): Promise<DbHandle> {
  assertTestDatabaseUrl(databaseUrl);
  if (instance) throw new Error('db already initialized');
  const control = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const databaseName = `keel_test_${randomUUID().replaceAll('-', '')}`;
  // 名字完全在本函数生成；只有 CREATE 成功后才取得清理这个精确对象的资格。
  let created = false;
  let handle: DbHandle | undefined;
  try {
    await control.query(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    created = true;
    const isolatedUrl = new URL(databaseUrl);
    isolatedUrl.pathname = `/${databaseName}`;
    handle = initDb({ driver: 'postgres', databaseUrl: isolatedUrl.toString() });
    const isolated = handle;
    let closing: Promise<void> | undefined;
    return {
      db: isolated.db,
      migrate: isolated.migrate,
      close() {
        closing ??= (async () => {
          try {
            await isolated.close();
            await control.query(`DROP DATABASE "${databaseName}"`);
            created = false;
          } finally {
            await control.end();
          }
        })();
        return closing;
      },
    };
  } catch (error) {
    try {
      await handle?.close();
      if (created) await control.query(`DROP DATABASE "${databaseName}"`);
    } finally {
      await control.end();
    }
    throw error;
  }
}
