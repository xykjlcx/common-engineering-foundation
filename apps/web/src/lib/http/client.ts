import { createRequestDeadline } from './deadline';
import { z } from 'zod';
import { AuthExpiredError, BizError, ContractError, HttpError } from './errors';
import { authEvents } from './events';
import { requestConfig } from '@/config';
import type { ApiContract, BlobResult } from './contract';

const BASE = requestConfig.baseUrl;
// 对齐后端 Problem（ADR-005/ADR-010 决策五）：detail 可选（后端不产，回退 title→code）、
// params 为 i18n 通道、traceId 可为 null、code 段内放行下划线（user.not_found / *.version_conflict）
const PROBLEM_DETAIL_SCHEMA = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  code: z.string().regex(/^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/),
  params: z.record(z.string(), z.unknown()).optional(),
  traceId: z.string().nullish(),
});

let getLocale: () => string | null = () => document.documentElement.lang || navigator.language || 'zh-CN';

// 认证凭据不由本层承担（ADR-010 决策一）：会话是 HttpOnly Cookie，浏览器同源自动携带。
// 本文件曾有 Authorization 头注入 + 刷新令牌重放链 + 令牌代际跟踪，随 Cookie 会话改造整体拆除——
// 前端既不持有令牌，也就没有"续期/重放/代际"可言。这里只保留 401 → 全局登出广播。
let expiryLatch: AuthExpiredError | null = null;

/** 会话切换（登录 / 登出 / 过期后清理）时复位过期闩：下一个会话的 401 必须能重新广播 */
export function resetAuthExpiryLatch() {
  expiryLatch = null;
}

export function bindLocaleGetter(fn: () => string | null) {
  getLocale = fn;
}

export interface HttpRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** URLSearchParams 只承载标量；对象/数组没有约定的序列化形态，由调用方先拍平 */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

function toQueryString(params: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  return search.toString();
}

type RequestDeadline = ReturnType<typeof createRequestDeadline>;

function abortError(deadline: RequestDeadline, cause?: unknown): HttpError {
  return new HttpError(
    0,
    deadline.didTimeout() ? 'request timeout' : 'request aborted',
    cause === undefined ? undefined : { cause },
  );
}

// 失败原因要原样转发（abort reason / 上游拒因都可能不是 Error），所以先把结果收进信封再抛，
// 而不是 reject(unknown)——rejection reason 必须是 Error。
type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function raceWithSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  const outcome = await new Promise<Settled<T>>((resolve) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const settleOnce = (result: Settled<T>) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const onAbort = () => {
      settleOnce({ ok: false, error: signal.reason });
    };
    void promise.then(
      (value) => settleOnce({ ok: true, value }),
      (error: unknown) => settleOnce({ ok: false, error }),
    );
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  if (outcome.ok) return outcome.value;
  throw outcome.error;
}

function encodeBody(body: unknown): { body?: BodyInit; contentType?: string } {
  if (body === undefined) return {};
  if (body instanceof FormData) return { body };
  return { body: JSON.stringify(body), contentType: 'application/json' };
}

function currentLocale(): string {
  return getLocale() || 'zh-CN';
}

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const encoded = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1];
  const plain = contentDisposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  const raw = encoded ?? plain?.[1] ?? plain?.[2];
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^"|"$/g, '');
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) return Number(normalized) * 1_000;
  const date = Date.parse(normalized);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}

async function readLimitedText(response: Response, signal: AbortSignal): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytesRead = 0;
  let reachedNaturalEof = false;
  try {
    while (bytesRead < requestConfig.maxErrorBodyBytes) {
      const { done, value } = await raceWithSignal(reader.read(), signal);
      if (done) {
        reachedNaturalEof = true;
        break;
      }
      const remaining = requestConfig.maxErrorBodyBytes - bytesRead;
      const accepted = value.subarray(0, remaining);
      chunks.push(decoder.decode(accepted, { stream: true }));
      bytesRead += accepted.byteLength;
      if (accepted.byteLength < value.byteLength || bytesRead >= requestConfig.maxErrorBodyBytes) {
        await reader.cancel();
        break;
      }
    }
    // 只在真实 EOF 刷新 decoder；被 byte cap 截断时丢弃缓冲的半个 UTF-8 码点。
    if (reachedNaturalEof) chunks.push(decoder.decode());
    return chunks.join('');
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function readOwnedBodyParts(response: Response, signal: AbortSignal): Promise<ArrayBuffer[]> {
  if (!response.body) return [];
  const reader = response.body.getReader();
  const parts: ArrayBuffer[] = [];
  let cancelled = false;
  const cancelOnce = async (reason: unknown) => {
    if (cancelled) return;
    cancelled = true;
    await reader.cancel(reason).catch(() => undefined);
  };

  try {
    while (true) {
      const { done, value } = await raceWithSignal(reader.read(), signal);
      if (done) break;
      const ownedPart = new ArrayBuffer(value.byteLength);
      new Uint8Array(ownedPart).set(value);
      parts.push(ownedPart);
    }
  } catch (error) {
    await cancelOnce(error);
    throw error;
  } finally {
    reader.releaseLock();
  }

  return parts;
}

function mergeBodyParts(parts: ArrayBuffer[]): Uint8Array {
  const totalBytes = parts.reduce((total, part) => total + part.byteLength, 0);
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const part of parts) {
    bytes.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return bytes;
}

async function readAllBodyBytes(response: Response, signal: AbortSignal): Promise<Uint8Array> {
  return mergeBodyParts(await readOwnedBodyParts(response, signal));
}

async function discardOwnedBody(response: Response, signal: AbortSignal): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  try {
    await raceWithSignal(reader.cancel('void response body is ignored'), signal);
  } finally {
    reader.releaseLock();
  }
}

async function decodeError(response: Response, signal: AbortSignal): Promise<BizError> {
  const traceId = response.headers.get(requestConfig.traceHeaderName);
  const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';
  const body = await readLimitedText(response, signal);

  if (contentType.includes('json') && body) {
    try {
      const parsed = PROBLEM_DETAIL_SCHEMA.safeParse(JSON.parse(body));
      if (parsed.success) {
        return new BizError({
          status: response.status,
          code: parsed.data.code,
          detail: parsed.data.detail ?? null,
          title: parsed.data.title ?? null,
          params: parsed.data.params ?? {},
          traceId: parsed.data.traceId ?? traceId,
          instance: parsed.data.instance ?? null,
          retryAfter,
        });
      }
    } catch {
      // 非法 JSON 与畸形 ProblemDetail 统一落到安全 transport fallback。
    }
  }

  const summarySource = contentType.includes('text/html') ? body.replace(/<[^>]*>/g, ' ') : body;
  const summary = summarySource.replace(/\s+/g, ' ').trim().slice(0, requestConfig.maxErrorSummaryChars);
  return new BizError({
    status: response.status,
    code: 'transport.http-error',
    detail: summary || response.statusText || `HTTP ${response.status}`,
    traceId,
    instance: null,
    retryAfter,
  });
}

function canRetryTransport(method: string, retryCount: number): boolean {
  return requestConfig.retryableMethods.includes(method) && retryCount < requestConfig.maxTransportRetries;
}

async function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw signal.reason;
  if (delayMs <= 0) return;
  const aborted = await new Promise<boolean>((resolve) => {
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const timeoutId = globalThis.setTimeout(() => {
      cleanup();
      resolve(false);
    }, delayMs);
    const onAbort = () => {
      globalThis.clearTimeout(timeoutId);
      cleanup();
      resolve(true);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
  if (aborted) throw signal.reason;
}

/**
 * 401 → 全局登出广播（每个会话只广播一次：并发请求同时 401 时不要触发 N 次导航）。
 * 闩由 resetAuthExpiryLatch 在会话切换处复位。
 */
export function failAuthExpired(cause?: unknown): AuthExpiredError {
  if (expiryLatch) return expiryLatch;
  const error = new AuthExpiredError('auth expired', cause === undefined ? undefined : { cause });
  expiryLatch = error;
  authEvents.emit('expired');
  return error;
}

async function decodeSuccess<T>(
  response: Response,
  method: string,
  url: string,
  contract: ApiContract<T>,
  signal: AbortSignal,
): Promise<T> {
  let raw: unknown;
  if (contract.responseKind === 'void') {
    await discardOwnedBody(response, signal);
    raw = undefined;
  } else if (contract.responseKind === 'blob') {
    const contentType = response.headers.get('Content-Type');
    const parts = await readOwnedBodyParts(response, signal);
    const blob = new Blob(parts, { type: contentType ?? '' });
    const result: BlobResult = {
      blob,
      filename: parseFilename(response.headers.get('Content-Disposition')),
      contentType: contentType ?? (blob.type || null),
    };
    raw = result;
  } else {
    try {
      const bytes = await readAllBodyBytes(response, signal);
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      throw new HttpError(response.status, 'invalid json response', { cause: error });
    }
  }

  try {
    return contract.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ContractError(`Response contract failed for ${method} ${url}`, error.issues);
    }
    throw error;
  }
}

async function requestCore<T>(
  method: string,
  url: string,
  body: unknown,
  params: QueryParams | undefined,
  contract: ApiContract<T>,
  options?: HttpRequestOptions,
): Promise<T> {
  const query = params ? toQueryString(params) : '';
  const target = `${BASE}${url}${query ? `?${query}` : ''}`;
  const encoded = encodeBody(body);
  let retryCount = 0;
  const deadline = createRequestDeadline(options);

  try {
    if (deadline.signal.aborted) throw deadline.signal.reason;
    while (true) {
      let response: Response;
      try {
        response = await raceWithSignal(
          fetch(target, {
            method,
            credentials: requestConfig.credentials,
            headers: {
              Accept: contract.responseKind === 'blob' ? '*/*' : 'application/json, application/problem+json',
              'Accept-Language': currentLocale(),
              ...(encoded.contentType ? { 'Content-Type': encoded.contentType } : {}),
            },
            body: encoded.body,
            signal: deadline.signal,
          }),
          deadline.signal,
        );
      } catch (error) {
        if (deadline.signal.aborted) throw error;
        if (canRetryTransport(method, retryCount)) {
          retryCount += 1;
          continue;
        }
        throw new HttpError(0, 'network error', { cause: error });
      }

      if (response.ok) {
        const result = await decodeSuccess(response, method, url, contract, deadline.signal);
        if (deadline.signal.aborted) throw abortError(deadline);
        return result;
      }
      const error = await decodeError(response, deadline.signal);
      // 会话已失效：Cookie 会话没有前端可执行的续期动作，直接广播全局登出（不重放、不重试）
      if (response.status === requestConfig.authExpiredStatus) throw failAuthExpired(error);
      if (
        requestConfig.retryableStatuses.includes(response.status) &&
        canRetryTransport(method, retryCount)
      ) {
        retryCount += 1;
        await waitForRetry(error.retryAfter ?? 0, deadline.signal);
        continue;
      }
      throw error;
    }
  } catch (error) {
    if (deadline.signal.aborted) throw abortError(deadline, error);
    throw error;
  } finally {
    deadline.dispose();
  }
}

export const http = {
  get: <T>(
    url: string,
    params: QueryParams | undefined,
    contract: ApiContract<T>,
    options?: HttpRequestOptions,
  ) => requestCore('GET', url, undefined, params, contract, options),
  post: <T>(url: string, body: unknown, contract: ApiContract<T>, options?: HttpRequestOptions) =>
    requestCore('POST', url, body, undefined, contract, options),
  put: <T>(url: string, body: unknown, contract: ApiContract<T>, options?: HttpRequestOptions) =>
    requestCore('PUT', url, body, undefined, contract, options),
  patch: <T>(url: string, body: unknown, contract: ApiContract<T>, options?: HttpRequestOptions) =>
    requestCore('PATCH', url, body, undefined, contract, options),
  del: <T>(url: string, contract: ApiContract<T>, options?: HttpRequestOptions) =>
    requestCore('DELETE', url, undefined, undefined, contract, options),
};
