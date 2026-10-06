import { getConnInfo } from '@hono/node-server/conninfo';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import type { AnyRouter } from '@orpc/server';
import { RPCHandler, type RPCHandlerOptions } from '@orpc/server/fetch';
import { experimental_ZodSmartCoercionPlugin } from '@orpc/zod/zod4';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { clientIpFrom } from './kernel/client-ip.js';
import { systemClock, type Clock } from './kernel/clock.js';
import { contentTypeRejectReason, csrfRejectReason } from './kernel/csrf.js';
import { assertMigrationsCurrent, coreDb, pingDb } from './kernel/db.js';
import { errorStatuses } from './errors.js';
import {
  KERNEL_ERROR_CODES,
  PermissionError,
  toProblem,
  toWireError,
  ValidationError,
} from './kernel/errors.js';
import { uuidv7 } from './kernel/idgen.js';
import { silentLogger, type Logger } from './kernel/logger.js';
import { createCookieJar, type RequestEnv } from './kernel/middleware.js';
import { DEFAULT_RUNTIME_POLICY, type RuntimePolicy } from './kernel/policy.js';
import { collectMultipartRoutes, type InitialContext, type KernelServices } from './kernel/procedures.js';
import { SESSION_COOKIE } from './kernel/session.js';
import { generateSpec } from './openapi.js';
import { router as productionRouter } from './router.js';

// REST 错误重写先于 oRPC 挂载，RPC 保持原生错误协议。
// REST 类型转换依赖 experimental_ZodSmartCoercionPlugin，升级 oRPC 时需验证兼容性。

export interface AppOptions {
  clock?: Clock;
  services?: Partial<KernelServices>;
  /** 测试注入口（错误面 e2e 用 fixture router）；生产恒为默认 router */
  router?: AnyRouter;
  /** null 表示开发态反射任意 Origin；生产未配置时传空列表。 */
  corsOrigins?: readonly string[];
  /** 结构化日志根实例（index.ts 注入）；缺省静默（测试态） */
  logger?: Logger;
  /** development 关闭 Secure，以兼容 Safari 的 HTTP localhost Cookie。 */
  secureCookies?: boolean;
  /** 仅在可信反代覆写或追加 XFF 时设置代理跳数；默认不信任 XFF。 */
  trustedProxyHops?: number;
  /** 失败锁定与会话时长；index.ts 从 env 组装，缺省用实现默认值。 */
  policy?: RuntimePolicy;
  errorStatuses?: ReadonlyMap<string, number>;
}

function envOf<C extends Context>(c: C, opts: AppOptions): RequestEnv {
  const req = c.req.raw;

  const traceId = uuidv7();

  let socketIp: string | null;
  try {
    socketIp = getConnInfo(c).remote.address ?? null;
  } catch {
    // 非 node 适配层（未来 edge 运行时）取不到 socket 信息——退化为无 IP，不猜
    socketIp = null;
  }
  return {
    cookies: createCookieJar(req.headers.get('cookie'), { secure: opts.secureCookies ?? true }),
    ip: clientIpFrom({
      xff: req.headers.get('x-forwarded-for'),
      socketIp,
      trustedProxyHops: opts.trustedProxyHops ?? 0,
    }),
    ua: req.headers.get('user-agent'),
    clock: opts.clock ?? systemClock,
    traceId,
    logger: (opts.logger ?? silentLogger).child({ traceId }),
    policy: opts.policy ?? DEFAULT_RUNTIME_POLICY,
    actorUserId: null,
  };
}

function applyCookies(response: Response, env: RequestEnv): Response {
  if (env.cookies.outgoing.length === 0) return response;
  const headers = new Headers(response.headers);
  for (const c of env.cookies.outgoing) headers.append('set-cookie', c);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function createApp(opts: AppOptions = {}) {
  const app = new Hono<{ Variables: { requestEnv: RequestEnv } }>();
  app.use('*', async (c, next) => {
    const env = envOf(c, opts);
    c.set('requestEnv', env);
    await next();
    c.header('x-trace-id', env.traceId);
  });
  const router = opts.router ?? productionRouter;
  const log = opts.logger ?? silentLogger;

  // CORS 先于所有路由注册（healthz 也吃到响应头）；生产网关同源仍由部署层承担
  const allowList = opts.corsOrigins;
  // 开发态同时放行跨域与 CSRF；显式日志用于识别误用此配置的部署。
  if (allowList === undefined) {
    log.warn(
      { corsOrigins: 'reflect-any', csrfGuard: 'disabled' },
      'CORS_ORIGINS unset: reflecting any Origin and CSRF guard is short-circuited — development convenience only, set CORS_ORIGINS for staging/production',
    );
  }
  app.use(
    '*',
    cors({
      origin: allowList
        ? (origin) => (origin && allowList.includes(origin) ? origin : null)
        : (origin) => origin ?? '*',
      credentials: true,
    }),
  );

  // 存活面：进程在、连接可用即 200。不校验迁移，滚动发布期间不因就绪未达成而被重启。
  app.get('/healthz', async (c) => {
    try {
      await pingDb(coreDb());
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false }, 503);
    }
  });

  // 就绪面：连接可用 + 部署迁移已完全对上。迁移状态在进程内不会自愈也不会退化，
  // 首次通过后只缓存结论，避免每次探测重扫迁移历史。
  let migrationsReady = false;
  app.get('/readyz', async (c) => {
    try {
      await pingDb(coreDb());
      if (!migrationsReady) {
        await assertMigrationsCurrent(coreDb());
        migrationsReady = true;
      }
      return c.json({ ok: true });
    } catch (error) {
      log.warn({ err: error }, 'readiness check failed');
      return c.json({ ok: false }, 503);
    }
  });

  // CSRF 检查覆盖两个 API 面，必须先于 oRPC 挂载。
  // 允许 multipart 的路径由 router 反查得出——切片声明 meta.multipart 是唯一真相源。
  const multipartPaths = new Set(
    collectMultipartRoutes(router).flatMap((route) => [
      `/api/v1${route.routePath}`,
      `/rpc/${route.procedurePath.replaceAll('.', '/')}`,
    ]),
  );
  const trustsProxy = (opts.trustedProxyHops ?? 0) > 0;
  const assertRequestAllowed = (request: Request, env: RequestEnv): void => {
    const h = request.headers;
    function rejectWith(status: 415 | 403, code: string, reason: string, logMessage: string): never {
      env.logger.warn({ reason }, logMessage);
      const error =
        status === 403 ? new PermissionError({ reason }, code) : new ValidationError(code, { reason });
      throw toWireError(error, env.traceId);
    }
    // 内容类型闸先行：覆盖**无会话 Cookie** 的写请求（登录 CSRF 面，见 csrf.ts 注释）
    const ctReason = contentTypeRejectReason({
      method: request.method,
      contentType: h.get('content-type'),
      // multipart 只对声明了该形态的 procedure 放行；会话、用途权限与同源检查照常执行。
      allowMultipart: request.method === 'POST' && multipartPaths.has(new URL(request.url).pathname),
    });
    if (ctReason !== null) {
      return rejectWith(415, KERNEL_ERROR_CODES.CONTENT_TYPE_REJECTED, ctReason, 'content-type rejected');
    }
    const reason = csrfRejectReason({
      hasSessionCookie: (h.get('cookie') ?? '').includes(`${SESSION_COOKIE}=`),
      secFetchSite: h.get('sec-fetch-site'),
      origin: h.get('origin'),
      referer: h.get('referer'),
      // 仅信任已声明代理提供的 Host，防止伪造 XFH 绕过同源校验。
      requestHost: trustsProxy ? (h.get('x-forwarded-host') ?? h.get('host')) : h.get('host'),
      corsOrigins: allowList ?? null,
    });
    if (reason === null) return;
    return rejectWith(403, KERNEL_ERROR_CODES.CSRF_REJECTED, reason, 'csrf rejected');
  };
  type TransportContext = InitialContext & { request: Request };
  const transportBoundary: NonNullable<RPCHandlerOptions<TransportContext>['interceptors']>[number] = async (
    options,
  ) => {
    const { context } = options;
    assertRequestAllowed(context.request, context.env);
    try {
      return await options.next();
    } catch (error) {
      // JSON 解码发生在 procedure 外层，仍归请求参数错误，且不回显原始报文。
      throw toWireError(
        error instanceof SyntaxError ? new ValidationError(KERNEL_ERROR_CODES.VALIDATION_FAILED) : error,
        context.env.traceId,
        context.errorStatuses,
      );
    }
  };

  app.use('/api/v1/*', async (c, next) => {
    await next();
    const res = c.res;
    if (res.status < 400) return;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return;
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      c.res = new Response(text, { status: res.status, headers: res.headers });
      return;
    }
    // 保留原响应头（Set-Cookie 等），只改写 content-type 与 body
    const headers = new Headers(res.headers);
    headers.set('content-type', 'application/problem+json; charset=utf-8');
    headers.delete('content-length');
    c.res = new Response(JSON.stringify(toProblem(parsed, res.status)), { status: res.status, headers });
  });

  const rpcHandler = new RPCHandler<TransportContext>(router, { interceptors: [transportBoundary] });
  app.use('/rpc/*', async (c, next) => {
    const env = c.get('requestEnv');
    const { matched, response } = await rpcHandler.handle(c.req.raw, {
      prefix: '/rpc',
      context: {
        env,
        request: c.req.raw,
        services: opts.services,
        errorStatuses: opts.errorStatuses ?? errorStatuses.statusByCode,
      },
    });
    if (matched) return applyCookies(response, env);
    await next();
  });

  const openapiHandler = new OpenAPIHandler<TransportContext>(router, {
    plugins: [new experimental_ZodSmartCoercionPlugin()],
    interceptors: [transportBoundary],
  });
  app.use('/api/v1/*', async (c, next) => {
    const env = c.get('requestEnv');
    const { matched, response } = await openapiHandler.handle(c.req.raw, {
      prefix: '/api/v1',
      context: {
        env,
        request: c.req.raw,
        services: opts.services,
        errorStatuses: opts.errorStatuses ?? errorStatuses.statusByCode,
      },
    });
    if (matched) return applyCookies(response, env);
    await next();
  });

  app.get('/api/openapi.json', async (c) => c.json(await generateSpec()));

  return app;
}
