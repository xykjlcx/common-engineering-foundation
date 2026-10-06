import { isLazy, isProcedure, os } from '@orpc/server';
import {
  logQueryAccess,
  recordMany,
  redactParams,
  type AuditOutcome,
  type AuditPatch,
  type AuditRecord,
} from './audit.js';
import { coreDb } from './db.js';
import {
  BizError,
  isKnownWireError,
  PermissionError,
  SystemError,
  toWireError,
  ValidationError,
} from './errors.js';
import { uuidv7 } from './idgen.js';
import {
  assertPermission,
  assertPlatformPrincipal,
  buildCtx,
  buildPublicCtx,
  failClosedPrincipalLoader,
  PLATFORM_PERMISSION_PREFIX,
  resolvePrincipal,
  type Principal,
  type PrincipalLoader,
  type RequestEnv,
} from './middleware.js';

// 查询分流依据契约 route method；RPC 实际 HTTP 方法均为 POST，不能用于区分读写。

export interface ProcMeta {
  /** 墙三权限点；显式 'none' 时必须给 permNoneReason */
  perm?: string;
  permNoneReason?: string;
  /**
   * perm:'none' 且 handler 内自行判「持有其中任一权限即可」时，在此声明全部候选码。
   * 基座不据此放行（判定仍在 handler），但能力目录必须收全，否则这些码在
   * collectDeclaredCapabilities 里查无声明处，超管可运行能力集也会漏掉它们。
   */
  anyOf?: readonly string[];
  /** 无条件超管专属：由 authedBase 拒绝非超管并落 denied */
  superuserOnly?: true;
  /**
   * 该 procedure 接收 multipart/form-data。内容类型闸的白名单由 router 反查此位，
   * 装配层不得再各自维护一份路径清单（三处真相必然漂移）。
   */
  multipart?: true;
}

type KernelMeta = ProcMeta & { family?: 'authed' };

export interface KernelServices {
  principalLoader: PrincipalLoader;
}

export interface InitialContext {
  env: RequestEnv;
  services?: Partial<KernelServices>;
  errorStatuses?: ReadonlyMap<string, number>;
}

/** 只用于副作用判定；只读 procedure 仍须声明权限。 */
export const QUERY_HTTP_METHODS: readonly string[] = ['GET', 'HEAD'];
export const DEFAULT_HTTP_METHOD = 'POST';

interface OrpcProcedureDef {
  route?: { method?: string; path?: string };
  meta?: KernelMeta;
}

function defOf(procedure: unknown): OrpcProcedureDef {
  return (procedure as Record<'~orpc', OrpcProcedureDef>)['~orpc'];
}

function isQueryRoute(def: OrpcProcedureDef): boolean {
  return QUERY_HTTP_METHODS.includes(def.route?.method ?? DEFAULT_HTTP_METHOD);
}

/** 耗时用单调时钟；业务时钟可冻结，不能用于计时。 */
function elapsedMs(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}

/** 所有 procedure 均须声明权限；显式 none 必须附带理由。 */
export function assertRouterPermsDeclared(router: unknown): void {
  const offenders: string[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (node === null || typeof node !== 'object') return;
    // 当前遍历不支持 lazy 子树；拒绝启动以免漏检权限和能力目录。
    if (isLazy(node)) {
      throw new Error(`router 含 lazy 子树（${prefix || '<root>'}）：守卫与权限聚合尚不支持遍历，拒绝启动`);
    }
    if (isProcedure(node)) {
      const def = defOf(node);
      const perm = def.meta?.perm;
      if (perm === undefined) offenders.push(`${prefix}（未声明 meta.perm）`);
      else if (perm === 'none' && !def.meta?.permNoneReason)
        offenders.push(`${prefix}（perm:'none' 无理由）`);
      if (def.meta?.superuserOnly === true && def.meta.family !== 'authed')
        offenders.push(`${prefix}（superuserOnly 只能用于 authedProc/sensitiveProc）`);
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>))
      walk(v, prefix ? `${prefix}.${k}` : k);
  };
  walk(router, '');
  if (offenders.length > 0) {
    throw new Error(`procedure 权限位缺失，拒绝启动：${offenders.join('；')}`);
  }
}

export function collectDeclaredBusinessPerms(router: unknown): ReadonlySet<string> {
  return new Set(collectDeclaredCapabilities(router).map((item) => item.perm));
}

export type DeclaredCapability = {
  perm: string;
  superuserOnly: boolean;
  router: string;
  procedure: string;
};

export function collectDeclaredCapabilities(router: unknown): DeclaredCapability[] {
  const acc: DeclaredCapability[] = [];
  const walk = (node: unknown, prefix: string, routerKey: string | null): void => {
    if (node === null || typeof node !== 'object') return;
    if (isProcedure(node)) {
      const meta = defOf(node).meta ?? {};
      for (const perm of [meta.perm, ...(meta.anyOf ?? [])]) {
        if (perm === undefined || perm === 'none' || perm.startsWith(PLATFORM_PERMISSION_PREFIX)) continue;
        if (!routerKey) continue;
        acc.push({
          perm,
          superuserOnly: meta.superuserOnly === true,
          router: routerKey,
          procedure: prefix,
        });
      }
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      walk(value, path, prefix === '' ? key : routerKey);
    }
  };
  walk(router, '', null);
  return acc;
}

export interface MultipartRoute {
  /** 契约面路径（不含消费面前缀），如 `/files/avatars` */
  routePath: string;
  /** RPC 面 procedure 路径（点号分隔），如 `file.stageAvatar` */
  procedurePath: string;
}

/** 反查声明了 multipart 的 procedure；内容类型闸据此放行，路径不再手抄。 */
export function collectMultipartRoutes(router: unknown): MultipartRoute[] {
  const acc: MultipartRoute[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (node === null || typeof node !== 'object') return;
    if (isProcedure(node)) {
      const def = defOf(node);
      if (def.meta?.multipart === true && def.route?.path)
        acc.push({ routePath: def.route.path, procedurePath: prefix });
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>))
      walk(value, prefix ? `${prefix}.${key}` : key);
  };
  walk(router, '');
  return acc;
}

/** 运行期仍拒绝未声明权限的 procedure。 */
function assertPermDeclared(def: OrpcProcedureDef): void {
  if (def.meta?.perm === undefined) {
    throw new PermissionError({ reason: 'perm_undeclared' });
  }
}

const publicRoot = os.$context<InitialContext>().$meta<KernelMeta>({});
const authedRoot = os.$context<InitialContext>().$meta<KernelMeta>({ family: 'authed' });

/** 未知错误在降级前记录一次原始异常；业务错误不进入 error 告警。 */
const errorBoundary = publicRoot.middleware(async ({ context, next, path }) => {
  try {
    return await next();
  } catch (e) {
    const env = context.env;
    // 业务错误一律不把 err 本体交给序列化器：BizError/ValidationError 的 message
    // 就是 `code + JSON.stringify(params)`，原样打日志等于把入参（含口令类字段）落盘。
    if (e instanceof BizError && context.errorStatuses && !context.errorStatuses.has(e.code)) {
      env.logger.error(
        {
          code: e.code,
          params: redactParams(e.params),
          traceId: env.traceId,
          procedure: path.join('.'),
        },
        'unregistered BizError code',
      );
      throw toWireError(new SystemError(env.traceId), env.traceId, context.errorStatuses);
    }
    if (!isKnownWireError(e)) {
      env.logger.error(
        { err: e, traceId: env.traceId, procedure: path.join('.'), userId: env.actorUserId },
        'unhandled procedure error',
      );
    }
    throw toWireError(e, env.traceId, context.errorStatuses);
  }
});

/** handler 已提交，审计失败只记日志，避免返回业务失败造成误重试。 */
async function tryRecord(env: RequestEnv, records: readonly AuditRecord[]): Promise<void> {
  try {
    await recordMany(coreDb(), env.clock, uuidv7, records);
  } catch (e) {
    env.logger.error(
      {
        err: e,
        action: records[0]?.action,
        outcome: records[0]?.outcome,
        targetCount: records.length,
        traceId: env.traceId,
      },
      'audit write failed (fail-open)',
    );
  }
}

function auditWriter(env: RequestEnv, principal: Principal, action: string, withValues: boolean) {
  return (outcome: AuditOutcome, errorCode: string | null, patches: readonly AuditPatch[]): Promise<void> =>
    tryRecord(
      env,
      patches.map((patch) => ({
        actorUserId: principal.userId,
        sessionId: principal.session.id,
        isImpersonation: principal.session.kind === 'impersonation',
        action,
        ip: env.ip,
        traceId: env.traceId,
        outcome,
        errorCode,
        withValues,
        patch,
      })),
    );
}

export const publicProc = publicRoot.use(errorBoundary).use(async ({ context, next, procedure }) => {
  assertPermDeclared(defOf(procedure));
  return next({ context: { ...context, ...buildPublicCtx(context.env) } });
});

/** sensitive 同时启用审计前后值、业务失败与敏感查询留痕。 */
function authedBase(sensitive: boolean) {
  return authedRoot.use(errorBoundary).use(async ({ context, next, procedure, path }) => {
    const def = defOf(procedure);
    const meta = def.meta ?? {};
    assertPermDeclared(def);
    const loader = context.services?.principalLoader ?? failClosedPrincipalLoader;

    const principal = await resolvePrincipal(context.env, loader, meta.perm);
    const action = path.join('.');
    const audit = auditWriter(context.env, principal, action, sensitive);

    try {
      if (principal.restriction && !principal.restriction.allowedActions.has(action)) {
        throw new PermissionError({}, principal.restriction.errorCode);
      }
      if (meta.superuserOnly === true && !principal.isSuperuser) {
        throw new PermissionError({ reason: 'requires_superuser' });
      }
      assertPermission(meta.perm, principal.permissions);
    } catch (e) {
      if (e instanceof PermissionError) await audit('denied', e.code, [{}]);
      throw e;
    }

    const ctx = buildCtx(context.env, principal);
    const startedAt = performance.now();
    try {
      const result = await next({ context: { ...context, ...ctx } });
      if (isQueryRoute(def) && !sensitive) {
        logQueryAccess(context.env.logger, {
          procedure: action,
          userId: principal.userId,
          traceId: context.env.traceId,
          durationMs: elapsedMs(startedAt),
        });
      } else {
        await audit('success', null, ctx.audit.patches);
      }
      return result;
    } catch (e) {
      // 拒绝与敏感失败不按读写分流。
      if (e instanceof PermissionError) await audit('denied', e.code, ctx.audit.patches);
      else if (sensitive && (e instanceof BizError || e instanceof ValidationError)) {
        await audit('failure', e.code, ctx.audit.patches);
      }
      throw e;
    }
  });
}

export const authedProc = authedBase(false);

export const sensitiveProc = authedBase(true);

/** 平台面读取也须留痕，因此不参与查询日志分流。 */
export const platformProc = publicRoot.use(errorBoundary).use(async ({ context, next, procedure, path }) => {
  const def = defOf(procedure);
  const meta = def.meta ?? {};
  assertPermDeclared(def);
  const loader = context.services?.principalLoader ?? failClosedPrincipalLoader;
  const principal = await resolvePrincipal(context.env, loader, meta.perm);
  const audit = auditWriter(context.env, principal, path.join('.'), true);
  try {
    assertPlatformPrincipal(principal, meta.perm);
  } catch (e) {
    if (e instanceof PermissionError) await audit('denied', e.code, [{}]);
    throw e;
  }
  const ctx = buildCtx(context.env, principal);
  try {
    const result = await next({ context: { ...context, ...ctx } });
    await audit('success', null, ctx.audit.patches);
    return result;
  } catch (e) {
    if (e instanceof PermissionError) await audit('denied', e.code, ctx.audit.patches);
    else if (e instanceof BizError || e instanceof ValidationError)
      await audit('failure', e.code, ctx.audit.patches);
    throw e;
  }
});
