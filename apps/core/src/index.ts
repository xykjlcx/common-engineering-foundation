import { serve, type ServerType } from '@hono/node-server';
import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { EnvConfigError, loadEnv, type Env } from './env.js';
import { assertMigrationsCurrent, initDb } from './kernel/db.js';
import { createLogger } from './kernel/logger.js';
import { assertRouterPermsDeclared } from './kernel/procedures.js';
import type { RuntimePolicy } from './kernel/policy.js';
import { createIamPrincipalLoader } from './principal-loader.js';
import { router } from './router.js';
import { ensureRegisteredJobs, startJobScheduler } from './modules/job/api.js';
import { systemClock } from './kernel/clock.js';
import { uuidv7 } from './kernel/idgen.js';
import { startNoticeScheduler } from './modules/notice/api.js';

/** 在途请求的关闭宽限期；超过后强制断连，避免 keep-alive 或慢请求把关闭挂死。 */
export const SHUTDOWN_GRACE_MS = 10_000;

export async function shutdownServer(
  server: ServerType,
  closeDatabase: () => Promise<void>,
  graceMs: number = SHUTDOWN_GRACE_MS,
): Promise<void> {
  // 空闲 keep-alive 连接立刻断开；在途请求给完整宽限期，超时才强制断。
  // HTTP/2 服务器没有这两个方法，缺失时退化为纯 close() 等待。
  if ('closeIdleConnections' in server) server.closeIdleConnections();
  const forceClose = setTimeout(() => {
    if ('closeAllConnections' in server) server.closeAllConnections();
  }, graceMs);
  // 兜底定时器本身不得成为进程退出的理由。
  forceClose.unref();
  try {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      }),
    );
  } finally {
    clearTimeout(forceClose);
  }
  await closeDatabase();
}

export async function startCore(env: Env = loadEnv()) {
  const logger = createLogger({
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV === 'development',
  });

  assertRouterPermsDeclared(router);

  const handle = initDb({
    driver: env.DATABASE_DRIVER,
    max: env.DB_POOL_MAX,
    ...(env.DATABASE_URL ? { databaseUrl: env.DATABASE_URL } : {}),
    ...(env.PGLITE_DATA_DIR ? { pgliteDataDir: env.PGLITE_DATA_DIR } : {}),
  });
  try {
    if (env.NODE_ENV !== 'production' && env.DATABASE_DRIVER === 'pglite') await handle.migrate();
    else await assertMigrationsCurrent(handle.db);
    await ensureRegisteredJobs({ db: handle.db, clock: systemClock });
  } catch (error) {
    await handle.close();
    throw error;
  }

  const corsOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((s) => s.trim())
    : env.NODE_ENV === 'production'
      ? []
      : undefined;

  // kernel 不读 env：策略在此组装一次，经 createApp 注入请求上下文。
  const policy: RuntimePolicy = {
    lockThreshold: env.LOGIN_LOCK_THRESHOLD,
    ipLockThreshold: env.LOGIN_IP_THRESHOLD,
    lockWindowMs: env.LOGIN_LOCK_WINDOW_MS,
    sessionTtlMs: env.SESSION_TTL_MS,
    sessionRememberTtlMs: env.SESSION_REMEMBER_TTL_MS,
  };

  // Safari 的 HTTP localhost Cookie 不兼容 Secure。
  const server = serve(
    {
      fetch: createApp({
        logger,
        secureCookies: env.NODE_ENV !== 'development',
        policy,

        services: { principalLoader: createIamPrincipalLoader(router) },
        trustedProxyHops: env.TRUSTED_PROXY_HOPS,
        ...(corsOrigins ? { corsOrigins } : {}),
      }).fetch,
      port: env.PORT,
    },
    (info) => {
      logger.info({ port: info.port, driver: env.DATABASE_DRIVER }, 'keel-core listening');
    },
  );

  const scheduler = startJobScheduler({ db: handle.db, clock: systemClock, idgen: uuidv7, logger });
  const stopNoticeScheduler = startNoticeScheduler({
    db: handle.db,
    clock: systemClock,
    idgen: uuidv7,
    logger,
  });
  let closing: Promise<void> | undefined;
  const shutdown = () => {
    closing ??= shutdownServer(server, async () => {
      await stopNoticeScheduler();
      await scheduler.stop();
      await handle.close();
    });
    return closing;
  };
  return { server, shutdown };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const app = await startCore();
    const shutdown = () => {
      void app.shutdown().catch((error: unknown) => {
        createLogger().error({ err: error }, 'shutdown failed');
        process.exitCode = 1;
      });
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error: unknown) {
    if (error instanceof EnvConfigError) {
      createLogger().error({ err: error }, 'invalid environment');
      process.exit(1);
    }
    throw error;
  }
}
