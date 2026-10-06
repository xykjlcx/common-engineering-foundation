import { createAuditSink } from './audit.js';
import type { Clock } from './clock.js';
import type { DataScope, PublicCtx, RequestCtx } from './context.js';
import { coreDb } from './db.js';
import { BizError, KERNEL_ERROR_CODES, PermissionError } from './errors.js';
import { uuidv7 } from './idgen.js';
import type { Logger } from './logger.js';
import type { RuntimePolicy } from './policy.js';
import { resolve as resolveSessionRow, SESSION_COOKIE, type SessionRow } from './session.js';

export interface CookieOptions {
  maxAgeSeconds?: number;
  expires?: Date;
}

export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, opts?: CookieOptions): void;
  clear(name: string): void;
  /** 交给 HTTP 装配层写回 Set-Cookie */
  readonly outgoing: readonly string[];
}

export interface RequestEnv {
  cookies: CookieJar;
  ip: string | null;
  ua: string | null;
  clock: Clock;

  traceId: string;

  logger: Logger;
  /** 运行期可调策略；kernel 不读 env，数值由装配层注入。 */
  policy: RuntimePolicy;
  /** 主体解析后回填，让最外层错误边界能归因未知异常；此对象必须请求独享。 */
  actorUserId: string | null;
}

export function createCookieJar(header: string | null, jarOpts: { secure?: boolean } = {}): CookieJar {
  const incoming = new Map<string, string>();
  for (const part of (header ?? '').split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    // 畸形 Cookie 按缺失处理，避免 URIError 越过认证错误边界。
    try {
      incoming.set(part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1).trim()));
    } catch {
      continue;
    }
  }
  const outgoing: string[] = [];
  const serialize = (name: string, value: string, opts: CookieOptions): string => {
    // Safari 不接受 HTTP localhost 上的 Secure Cookie。
    const bits = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
    if (jarOpts.secure ?? true) bits.splice(3, 0, 'Secure');
    if (opts.maxAgeSeconds !== undefined) bits.push(`Max-Age=${String(opts.maxAgeSeconds)}`);
    if (opts.expires) bits.push(`Expires=${opts.expires.toUTCString()}`);
    return bits.join('; ');
  };
  return {
    outgoing,
    get: (name) => incoming.get(name),
    set: (name, value, opts = {}) => {
      outgoing.push(serialize(name, value, opts));
    },
    clear: (name) => {
      outgoing.push(serialize(name, '', { maxAgeSeconds: 0 }));
    },
  };
}

export interface Principal {
  session: SessionRow;
  userId: string;
  principal: string;
  scope: DataScope;
  isSuperuser: boolean;
  restriction?: { allowedActions: ReadonlySet<string>; errorCode: string };
  permissions: ReadonlySet<string>;
  availablePermissions: ReadonlySet<string>;
}

/** 未注入主体加载器时，权限与可见范围必须 fail-closed。 */
export interface PrincipalLoader {
  load(
    session: SessionRow,
    clock: Clock,
    permission?: string,
  ): Promise<
    Pick<Principal, 'scope' | 'permissions'> &
      Partial<Pick<Principal, 'isSuperuser' | 'restriction' | 'availablePermissions'>>
  >;
}

export const failClosedPrincipalLoader: PrincipalLoader = {
  load: () =>
    Promise.resolve({
      scope: 'own',
      permissions: new Set<string>(),
      availablePermissions: new Set<string>(),
    }),
};

/** 无效会话统一错误码，避免泄露其存在或吊销状态。 */
export async function resolvePrincipal(
  env: RequestEnv,
  loader: PrincipalLoader,
  permission?: string,
): Promise<Principal> {
  const raw = env.cookies.get(SESSION_COOKIE);
  if (!raw) throw new BizError(KERNEL_ERROR_CODES.SESSION_INVALID);
  const session = await resolveSessionRow(coreDb(), env.clock, raw);
  if (!session) throw new BizError(KERNEL_ERROR_CODES.SESSION_INVALID);
  const loaded = await loader.load(session, env.clock, permission);

  env.actorUserId = session.userId;
  return {
    session,
    userId: session.userId,
    principal: session.principal,
    scope: loaded.scope,
    isSuperuser: loaded.isSuperuser === true,
    ...(loaded.restriction ? { restriction: loaded.restriction } : {}),
    permissions: loaded.permissions,
    // 非 IAM loader 未声明能力时保持空集；绝不能把角色授权反推成已实现能力。
    availablePermissions: loaded.availablePermissions ?? new Set<string>(),
  };
}

export function assertPermission(perm: string | undefined, permissions: ReadonlySet<string>): void {
  if (perm === undefined || perm === 'none') return;
  if (!permissions.has(perm)) throw new PermissionError({ perm });
}

export const PLATFORM_PERMISSION_PREFIX = 'platform:';

export function assertPlatformPrincipal(p: Principal, perm: string | undefined): void {
  if (p.principal !== 'platform') throw new PermissionError({ reason: 'not_platform_session' });
  if (perm !== undefined && perm !== 'none' && !perm.startsWith(PLATFORM_PERMISSION_PREFIX)) {
    throw new PermissionError({ reason: 'platform_perm_prefix', perm });
  }
  assertPermission(perm, p.permissions);
}

export function buildCtx(env: RequestEnv, p: Principal): RequestCtx {
  return {
    db: coreDb(),
    clock: env.clock,
    logger: env.logger.child({ userId: p.userId }),
    idgen: uuidv7,
    // 同一个 jar 实例（非副本）：切片写进去的 Cookie 才能被 app.ts 的 applyCookies 落到响应头
    cookies: env.cookies,
    userId: p.userId,
    scope: p.scope,
    isSuperuser: p.isSuperuser,
    principal: p.principal,
    permissions: p.permissions,
    availablePermissions: p.availablePermissions,
    sessionId: p.session.id,
    isImpersonation: p.session.kind === 'impersonation',
    ip: env.ip,
    audit: createAuditSink(),
  };
}

export function buildPublicCtx(env: RequestEnv): PublicCtx {
  return {
    db: coreDb(),
    clock: env.clock,
    logger: env.logger,
    idgen: uuidv7,
    cookies: env.cookies,
    ip: env.ip,
    ua: env.ua,
    policy: env.policy,
  };
}
