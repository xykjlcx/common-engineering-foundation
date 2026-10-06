import path from 'node:path';
import * as z from 'zod';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    FILE_STORAGE_DIR: z.string().min(1).optional(),
    PORT: z.coerce.number().int().positive().default(3100),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    DATABASE_DRIVER: z.enum(['postgres', 'pglite']).default('postgres'),
    DATABASE_URL: z.url().optional(),
    /** pglite 数据目录；缺省 memory://（进程内、退出即失） */
    PGLITE_DATA_DIR: z.string().min(1).optional(),
    /** CORS 白名单（逗号分隔）；production 未配置时不放行任何跨域（fail-closed） */
    CORS_ORIGINS: z.string().min(1).optional(),
    /** 可信反代跳数；配置必须与代理覆写或追加 XFF 的拓扑一致。 */
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(8).default(0),
    /** core 连接池上限；core 池 + 任务池 + 运维预留应 ≤ max_connections 的 80%。 */
    DB_POOL_MAX: z.coerce.number().int().min(1).max(200).default(10),
    /** 单账号在失败窗口内的失败上限，达到即锁定。 */
    LOGIN_LOCK_THRESHOLD: z.coerce.number().int().min(1).default(5),
    /** 单 IP 在失败窗口内的失败上限（软限制，不阻断共享出口的合法账号）。 */
    LOGIN_IP_THRESHOLD: z.coerce.number().int().min(1).default(20),
    /** 登录失败计数窗口（毫秒）。 */
    LOGIN_LOCK_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(15 * 60 * 1000),
    /** 普通会话有效期（毫秒）。 */
    SESSION_TTL_MS: z.coerce
      .number()
      .int()
      .min(60_000)
      .default(12 * 60 * 60 * 1000),
    /** 记住我会话有效期（毫秒）；不可越过会话绝对过期上限。 */
    SESSION_REMEMBER_TTL_MS: z.coerce
      .number()
      .int()
      .min(60_000)
      .default(7 * 24 * 60 * 60 * 1000),
  })
  .check((ctx) => {
    if (ctx.value.NODE_ENV === 'production' && !ctx.value.FILE_STORAGE_DIR) {
      ctx.issues.push({
        code: 'custom',
        message: 'production requires FILE_STORAGE_DIR',
        path: ['FILE_STORAGE_DIR'],
        input: ctx.value.FILE_STORAGE_DIR,
      });
    }
    if (ctx.value.DATABASE_DRIVER === 'postgres' && !ctx.value.DATABASE_URL) {
      ctx.issues.push({
        code: 'custom',
        message: 'DATABASE_DRIVER=postgres 时必须提供 DATABASE_URL',
        path: ['DATABASE_URL'],
        input: ctx.value.DATABASE_URL,
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export class EnvConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvConfigError';
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new EnvConfigError(z.prettifyError(parsed.error));
  }
  return parsed.data;
}

/** 种子凭据与运行环境分开校验，生产拒绝把演示口令作为初始化凭据。 */
export function loadSeedAdminOptions(
  nodeEnv: Env['NODE_ENV'],
  source: NodeJS.ProcessEnv = process.env,
): { username: string; password: string } {
  const username = source.SEED_ADMIN_USERNAME?.trim();
  const password = source.SEED_ADMIN_PASSWORD;
  if (
    nodeEnv === 'production' &&
    (!username || !password || password.length < 8 || password === 'admin123')
  ) {
    throw new Error(
      'production seed requires explicit SEED_ADMIN_USERNAME and non-demo SEED_ADMIN_PASSWORD (at least 8 characters)',
    );
  }
  return { username: username || 'admin', password: password || 'admin123' };
}

/** PG 测试只接受单独命名的控制库，绝不回退到业务 DATABASE_URL。 */
export function loadTestDatabaseEnv(
  source: NodeJS.ProcessEnv = process.env,
): { driver: 'pglite' } | { driver: 'postgres'; databaseUrl: string } {
  if (source.DATABASE_DRIVER !== 'postgres') return { driver: 'pglite' };
  if (!source.TEST_DATABASE_URL) throw new Error('postgres tests require explicit TEST_DATABASE_URL');
  assertTestDatabaseUrl(source.TEST_DATABASE_URL);
  return { driver: 'postgres', databaseUrl: source.TEST_DATABASE_URL };
}

export function assertTestDatabaseUrl(databaseUrl: string): void {
  const url = new URL(databaseUrl);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !/(^|_)test(_|$)/.test(name)) {
    throw new Error('TEST_DATABASE_URL must use postgres and a dedicated database name containing test');
  }
}

/** 对象存储配置可独立读取，测试必须显式传入临时目录。 */
export function loadFileStorageDir(source: NodeJS.ProcessEnv = process.env): string {
  if (source.FILE_STORAGE_DIR?.trim()) return path.resolve(source.FILE_STORAGE_DIR);
  if (source.NODE_ENV === 'production' || source.NODE_ENV === 'test') {
    throw new Error('FILE_STORAGE_DIR is required in production and test');
  }
  return path.resolve('.data/avatars');
}
