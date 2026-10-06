import { env, type ParsedEnv } from './env';

// requestConfig 只描述后端协议的稳定约定，真正的请求流程在 lib/http/client.ts。
export function createRequestConfig(source: ParsedEnv) {
  return {
    baseUrl: source.apiBaseUrl,
    timeoutMs: source.requestTimeoutMs,
    authExpiredStatus: 401,
    traceHeaderName: 'X-Trace-Id',
    // 会话是同源 HttpOnly Cookie（ADR-010 决策一）：浏览器自动携带，
    // 前端既不注入 Authorization 头也不持有令牌，故此处不再有认证头名 / 令牌前缀 / 刷新相关配置。
    credentials: 'same-origin' as const,
    retryableMethods: ['GET', 'HEAD'],
    retryableStatuses: [408, 429, 502, 503, 504],
    maxTransportRetries: 1,
    maxErrorBodyBytes: 64 * 1024,
    maxErrorSummaryChars: 512,
  };
}

export const requestConfig = createRequestConfig(env);
