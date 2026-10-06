import { z } from 'zod';
import { createRequestDeadline } from '@/lib/http/deadline';
import { createORPCClient, ORPCError } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { AppRouterClient } from '@keel/core/client';
import { requestConfig } from '@/config';
import { BizError, HttpError } from '@/lib/http/errors';
import { failAuthExpired } from '@/lib/http/client';

// oRPC contracts 直连（ADR-003 裁决①）：认证面走 /rpc，类型端到端由 core 的 router 推导，零 codegen。
// 纪律（裁决①附带条件 2）：本文件是 web 唯一接触 oRPC 运行时的地方；
// 只从 @keel/core/client import **类型**（AppRouterClient），运行时依赖仅 @orpc/client。
//
// 凭据：会话是 HttpOnly Cookie，由浏览器同源自动携带——前端不持有、不读取、不存储任何令牌。
// 因此这里没有 Authorization 头注入，也没有 refresh 重放链（服务端会话滑动续期，见 ADR-010 决策一）。

/** 会话失效码（kernel/errors.ts 的 KERNEL_ERROR_CODES.SESSION_INVALID）。web 不 import core 运行时，故此处按字面量对齐 */
const SESSION_INVALID = 'session.invalid';

const wireErrorDataSchema = z.object({
  code: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  traceId: z.string().nullable().optional(),
});

// ORPCError 的类默认实参就是 any，`instanceof` 只能收窄到 ORPCError<any, any>（code/data 全成 any）。
// 用显式谓词落到真实形状：code 恒为字符串，data 是待校验的线上负载。
function isRpcError(error: unknown): error is ORPCError<string, unknown> {
  return error instanceof ORPCError;
}

function wireData(data: unknown) {
  const parsed = wireErrorDataSchema.safeParse(data);
  return parsed.success ? parsed.data : {};
}

/**
 * oRPC 错误 → 应用错误模型（BizError / AuthExpiredError / HttpError）。
 * 全应用只有一套错误分支（query.ts 的 toast 策略、RouteError 的文案、LoginScene 的表单提示），
 * 不给 RPC 面开第二套；错误码/params/traceId 直取后端结构化通道（ADR-010 决策五）。
 */
function toAppError(error: unknown): unknown {
  if (isRpcError(error)) {
    const data = wireData(error.data);
    // 会话失效：等同 REST 面 401——复用 http client 的过期闩（同一会话只广播一次全局登出，
    // 并发 RPC/REST 混合 401 也不会触发 N 次 resetSession），调用方拿到 AuthExpiredError
    if (data.code === SESSION_INVALID) {
      return failAuthExpired(error);
    }
    return new BizError(
      {
        status: error.status,
        code: data.code ?? error.code,
        detail: null,
        title: null,
        params: data.params ?? {},
        traceId: data.traceId ?? null,
        instance: null,
        retryAfter: null,
      },
      { cause: error },
    );
  }
  // 传输层失败（断网 / 后端未起）：与 http client 同形，RouteError 才能给出"网络错误"而不是白屏
  if (error instanceof Error && error.name !== 'AbortError') {
    return new HttpError(0, 'network error', { cause: error });
  }
  return error;
}

const link = new RPCLink({
  url: new URL(`${requestConfig.baseUrl}/rpc`, window.location.origin),
  interceptors: [
    async (options) => {
      const deadline = createRequestDeadline({ signal: options.signal });
      // next 是 options 上的方法：解构会丢 this 绑定，改用 bind 取
      const next = options.next.bind(options);
      try {
        return await next({ ...options, signal: deadline.signal });
      } catch (error) {
        if (deadline.didTimeout())
          throw new HttpError(0, 'request timeout; outcome unknown', { cause: error });
        if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
        throw toAppError(error);
      } finally {
        deadline.dispose();
      }
    },
  ],
});

export const rpc: AppRouterClient = createORPCClient(link);
