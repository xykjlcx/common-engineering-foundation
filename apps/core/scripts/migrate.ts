import { EnvConfigError, loadEnv, type Env } from '../src/env.js';
import { initDb } from '../src/kernel/db.js';
import { createLogger } from '../src/kernel/logger.js';

// 显式部署步骤：由部署方串行执行一次，再启动应用实例。
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
  await handle.migrate();
  createLogger({ level: env.LOG_LEVEL }).info(
    { driver: env.DATABASE_DRIVER },
    'database migrations completed',
  );
} finally {
  await handle.close();
}
