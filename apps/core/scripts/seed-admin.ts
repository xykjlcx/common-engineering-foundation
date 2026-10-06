import { pathToFileURL } from 'node:url';
import { eq } from 'drizzle-orm';
import { EnvConfigError, loadEnv, loadSeedAdminOptions, type Env } from '../src/env.js';
import { initDb } from '../src/kernel/db.js';
import { hashPassword } from '../src/kernel/crypto.js';
import { uuidv5 } from '../src/kernel/idgen.js';
import { appUsers } from '../src/modules/user/schema.js';

// 开发默认 admin/admin123；生产须显式提供非演示凭据，且预先执行 db:migrate。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let env: Env;
  try {
    env = loadEnv();
  } catch (error) {
    if (!(error instanceof EnvConfigError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
  const { username, password } = loadSeedAdminOptions(env.NODE_ENV);
  const resetPassword = process.argv.includes('--reset-password');
  const handle = initDb({
    driver: env.DATABASE_DRIVER,
    ...(env.DATABASE_URL ? { databaseUrl: env.DATABASE_URL } : {}),
    ...(env.PGLITE_DATA_DIR ? { pgliteDataDir: env.PGLITE_DATA_DIR } : {}),
  });
  try {
    if (env.NODE_ENV !== 'production' && env.DATABASE_DRIVER === 'pglite') await handle.migrate();

    const now = new Date();
    const existing = await handle.db
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.username, username))
      .limit(1);
    const found = existing[0];

    if (found && !resetPassword) {
      console.log(
        `seed-admin: "${username}" already exists (${found.id}); pass --reset-password to reset its password`,
      );
    } else if (found) {
      await handle.db
        .update(appUsers)
        .set({
          passwordHash: await hashPassword(password),
          status: 'active',
          updatedAt: now,
        })
        .where(eq(appUsers.id, found.id));
      console.log(`seed-admin: password reset for "${username}" (${found.id})`);
    } else {
      const id = uuidv5(`seed:${username}`);
      await handle.db.insert(appUsers).values({
        id,
        username,
        name: '系统管理员',
        email: `${username}@example.com`,
        phone: '',
        passwordHash: await hashPassword(password),
        status: 'active',
        isSystemAdmin: true,
        version: 0,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`seed-admin: created "${username}" (${id})`);
    }
  } finally {
    await handle.close();
  }
}
