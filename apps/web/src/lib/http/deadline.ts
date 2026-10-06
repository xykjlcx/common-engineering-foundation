import { requestConfig } from '@/config';

export function createRequestDeadline(options?: { timeoutMs?: number; signal?: AbortSignal }) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutMs = options?.timeoutMs ?? requestConfig.timeoutMs;
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();

  if (options?.signal?.aborted) controller.abort();
  else options?.signal?.addEventListener('abort', abortFromCaller, { once: true });

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      globalThis.clearTimeout(timeoutId);
      options?.signal?.removeEventListener('abort', abortFromCaller);
    },
  };
}
