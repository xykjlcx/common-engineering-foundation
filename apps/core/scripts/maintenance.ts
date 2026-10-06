import { pathToFileURL } from 'node:url';
import { EnvConfigError, loadEnv, type Env } from '../src/env.js';
import { initDb } from '../src/kernel/db.js';
import type { Db } from '../src/kernel/context.js';
import { systemClock, type Clock } from '../src/kernel/clock.js';
import { purgeExpired } from '../src/kernel/session.js';
import { purgeOldLoginEvents } from '../src/modules/auth/schema.js';
import { LOGIN_EVENT_RETENTION_MS } from '../src/modules/auth/domain/login-rules.js';
import { cleanupExpiredAvatars } from '../src/modules/file/api.js';
import { createLogger } from '../src/kernel/logger.js';

export async function runMaintenance(db: Db, clock: Clock) {
  return {
    sessions: await purgeExpired(db, clock),
    loginEvents: await purgeOldLoginEvents(db, clock, LOGIN_EVENT_RETENTION_MS),
    files: await cleanupExpiredAvatars(db, clock),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
    databaseUrl: env.DATABASE_URL,
    pgliteDataDir: env.PGLITE_DATA_DIR,
  });
  try {
    const report = await runMaintenance(handle.db, systemClock);
    createLogger({ level: env.LOG_LEVEL }).info(report, 'maintenance completed');
    if (report.files.failures.length > 0) process.exitCode = 1;
  } finally {
    await handle.close();
  }
}
