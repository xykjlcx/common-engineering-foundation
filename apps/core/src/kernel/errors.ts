import { ORPCError } from '@orpc/server';
import * as z from 'zod';

export const KERNEL_ERROR_CODES = {
  SESSION_INVALID: 'session.invalid',
  CSRF_REJECTED: 'session.csrf_rejected',
  /** 内容类型闸（415）：与 CSRF_REJECTED 分码——同一 code 出两种 status 会让前端无法按 code 分支 */
  CONTENT_TYPE_REJECTED: 'session.content_type_rejected',
  PERMISSION_DENIED: 'permission.denied',
  ESCALATION_DENIED: 'permission.escalation_denied',
  SELF_GRANT_FORBIDDEN: 'permission.self_grant_forbidden',
  TENANT_SUSPENDED: 'tenant.suspended',
  TENANT_CLOSED: 'tenant.closed',
  VALIDATION_FAILED: 'validation.failed',
  SYSTEM_INTERNAL: 'system.internal',
} as const;

// 显式字段保持 erasableSyntaxOnly 兼容，供前端直接消费契约类型。

export class ValidationError extends Error {
  readonly code: string;
  readonly params: Record<string, unknown>;
  constructor(code: string, params: Record<string, unknown> = {}) {
    super(`${code} ${JSON.stringify(params)}`);
    this.name = 'ValidationError';
    this.code = code;
    this.params = params;
  }
}

export class BizError extends Error {
  readonly code: string;
  readonly params: Record<string, unknown>;
  constructor(code: string, params: Record<string, unknown> = {}) {
    super(`${code} ${JSON.stringify(params)}`);
    this.name = 'BizError';
    this.code = code;
    this.params = params;
  }
}

export class PermissionError extends Error {
  readonly params: Record<string, unknown>;
  readonly code: string;
  constructor(params: Record<string, unknown> = {}, code: string = KERNEL_ERROR_CODES.PERMISSION_DENIED) {
    super(`${code} ${JSON.stringify(params)}`);
    this.name = 'PermissionError';
    this.params = params;
    this.code = code;
  }
}

/** 系统错误：对外只露 traceId，详情进日志 */
export class SystemError extends Error {
  readonly code = KERNEL_ERROR_CODES.SYSTEM_INTERNAL;
  readonly params: Record<string, unknown> = {};
  readonly traceId: string;
  constructor(traceId: string) {
    super(`${KERNEL_ERROR_CODES.SYSTEM_INTERNAL} ${traceId}`);
    this.name = 'SystemError';
    this.traceId = traceId;
  }
}

export type ErrorDef = { status: number; message: string };

export type ErrorContract<C extends string = string> = {
  status: number;
  message: string;
  data: z.ZodObject<{
    code: z.ZodLiteral<C>;
    params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    traceId: z.ZodString;
  }>;
};

function contractFor(code: string, def: ErrorDef): ErrorContract<string> {
  return {
    status: def.status,
    message: def.message,
    data: z.object({
      code: z.literal(code),
      params: z.record(z.string(), z.unknown()),
      traceId: z.string(),
    }),
  };
}

export function defineErrors(
  defs: Record<string, ErrorDef>,
): Readonly<Record<string, ErrorContract<string>>> {
  const result: Record<string, ErrorContract<string>> = {};
  for (const code of Object.keys(defs)) {
    const def = defs[code];
    if (def === undefined) continue;
    result[code] = contractFor(code, def);
  }
  return Object.freeze(result);
}

export function pick(
  table: Readonly<Record<string, ErrorContract<string>>>,
  keys: readonly string[],
): Record<string, ErrorContract<string>> {
  const result: Record<string, ErrorContract<string>> = {};
  for (const key of keys) {
    const value = table[key];
    if (value === undefined) throw new Error(`unknown error contract: ${key}`);
    result[key] = value;
  }
  return result;
}

export function composeErrors(tables: readonly Record<string, { status: number; message: string }>[]) {
  const statusByCode = new Map<string, number>();
  const messageByCode = new Map<string, string>();
  for (const table of tables) {
    for (const [code, def] of Object.entries(table)) {
      const existing = statusByCode.get(code);
      if (existing !== undefined && existing !== def.status) {
        throw new Error(`error code ${code} conflict: ${String(existing)} vs ${String(def.status)}`);
      }
      statusByCode.set(code, def.status);
      messageByCode.set(code, def.message);
    }
  }
  return { statusByCode, messageByCode };
}

export const kernelErrors = defineErrors({
  [KERNEL_ERROR_CODES.SESSION_INVALID]: { status: 401, message: '会话无效或已过期' },
  [KERNEL_ERROR_CODES.CSRF_REJECTED]: { status: 403, message: '跨站请求被拒绝' },
  [KERNEL_ERROR_CODES.CONTENT_TYPE_REJECTED]: { status: 415, message: '不支持的内容类型' },
  [KERNEL_ERROR_CODES.PERMISSION_DENIED]: { status: 403, message: '无权执行此操作' },
  [KERNEL_ERROR_CODES.ESCALATION_DENIED]: { status: 403, message: '不能授予超出自身范围的权限' },
  [KERNEL_ERROR_CODES.SELF_GRANT_FORBIDDEN]: { status: 403, message: '不能给自己授予额外权限' },
  [KERNEL_ERROR_CODES.TENANT_SUSPENDED]: { status: 403, message: '租户已停用' },
  [KERNEL_ERROR_CODES.TENANT_CLOSED]: { status: 403, message: '租户已关闭' },
  [KERNEL_ERROR_CODES.VALIDATION_FAILED]: { status: 400, message: '请求参数不符合契约' },
  [KERNEL_ERROR_CODES.SYSTEM_INTERNAL]: { status: 500, message: '内部处理失败' },
});

export function statusOf(code: string, statuses?: ReadonlyMap<string, number>): number {
  const fromTable = statuses?.get(code);
  if (fromTable !== undefined) return fromTable;
  for (const [key, value] of Object.entries(kernelErrors)) {
    if (key === code) return value.status;
  }
  return 500;
}

export function isKnownWireError(
  e: unknown,
): e is ORPCError<string, unknown> | BizError | ValidationError | PermissionError {
  return (
    e instanceof ORPCError ||
    e instanceof BizError ||
    e instanceof ValidationError ||
    e instanceof PermissionError
  );
}

const WireErrorDataSchema = z.object({
  code: z.string(),
  params: z.record(z.string(), z.unknown()),
  traceId: z.string(),
});

// 标准校验结果可含原始 input、自定义 message 与嵌套错误；线上只保留字段定位与稳定码。
const ValidationIssuesSchema = z.object({
  issues: z.array(
    z.object({
      code: z.string().optional(),
      path: z.array(z.union([z.string(), z.number()])).optional(),
    }),
  ),
});

/**
 * 错误族 → 线上形状 `{code, params, traceId}`。响应体无信封：成功响应即返回值本身，
 * 失败走 oRPC error 通道。非错误族逃逸一律降级为系统错误（绝不泄漏内部消息）。
 */
export function toWireError(
  e: unknown,
  traceId: string,
  statuses?: ReadonlyMap<string, number>,
): ORPCError<string, unknown> {
  if (!isKnownWireError(e)) {
    return new ORPCError(KERNEL_ERROR_CODES.SYSTEM_INTERNAL, {
      status: 500,
      data: { code: KERNEL_ERROR_CODES.SYSTEM_INTERNAL, params: {}, traceId },
    });
  }
  if (e instanceof ORPCError) {
    const parsed = WireErrorDataSchema.safeParse(e.data);
    if (parsed.success) {
      return new ORPCError(parsed.data.code, {
        status: e.status,
        data: { ...parsed.data, traceId },
      });
    }
    if (e.code === 'BAD_REQUEST') {
      const issues = ValidationIssuesSchema.safeParse(e.data);
      return new ORPCError(KERNEL_ERROR_CODES.VALIDATION_FAILED, {
        status: 400,
        data: {
          code: KERNEL_ERROR_CODES.VALIDATION_FAILED,
          params: issues.success ? { issues: issues.data.issues } : {},
          traceId,
        },
      });
    }
    const code = e.status >= 500 ? KERNEL_ERROR_CODES.SYSTEM_INTERNAL : e.code;
    return new ORPCError(code, { status: e.status, data: { code, params: {}, traceId } });
  }
  const code = e.code;
  if (e instanceof BizError && statuses && !statuses.has(code)) {
    return new ORPCError(KERNEL_ERROR_CODES.SYSTEM_INTERNAL, {
      status: 500,
      data: { code: KERNEL_ERROR_CODES.SYSTEM_INTERNAL, params: {}, traceId },
    });
  }
  return new ORPCError(code, { status: statusOf(code, statuses), data: { code, params: e.params, traceId } });
}

const OrpcErrorBodySchema = z.looseObject({
  code: z.string().optional(),
  data: z
    .looseObject({
      code: z.string().optional(),
      params: z.record(z.string(), z.unknown()).optional(),
      traceId: z.string().optional(),
    })
    .optional(),
});

export interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  params: Record<string, unknown>;
  traceId: string | null;
}

/** 已规范化的错误语义适配为 RFC7807；不在协议层重新解释业务错误。 */
export function toProblem(body: unknown, httpStatus: number): Problem {
  const parsed = OrpcErrorBodySchema.safeParse(body);
  const b = parsed.success ? parsed.data : {};
  const code = b.data?.code ?? b.code ?? KERNEL_ERROR_CODES.SYSTEM_INTERNAL;
  return {
    type: 'about:blank',
    title: code,
    status: httpStatus,
    code,
    params: b.data?.params ?? {},
    traceId: b.data?.traceId ?? null,
  };
}

export const commonErrorContracts = pick(kernelErrors, [
  KERNEL_ERROR_CODES.SESSION_INVALID,
  KERNEL_ERROR_CODES.PERMISSION_DENIED,
  KERNEL_ERROR_CODES.VALIDATION_FAILED,
  KERNEL_ERROR_CODES.SYSTEM_INTERNAL,
]);
