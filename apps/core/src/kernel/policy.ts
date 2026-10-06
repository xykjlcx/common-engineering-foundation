/**
 * 运行期可调策略：默认值即当前实现值，装配层（index.ts ← env.ts）可整体覆写。
 * kernel 不读 env——数值经 createApp 注入请求上下文，测试也用同一入口覆写。
 */
export interface RuntimePolicy {
  /** 单账号在窗口内的失败上限，达到即锁定 */
  lockThreshold: number;
  /** 单 IP 在窗口内的失败上限（软限制） */
  ipLockThreshold: number;
  /** 失败计数窗口长度（毫秒） */
  lockWindowMs: number;
  /** 普通会话有效期（毫秒） */
  sessionTtlMs: number;
  /** 记住我会话有效期（毫秒） */
  sessionRememberTtlMs: number;
}

export const DEFAULT_RUNTIME_POLICY: RuntimePolicy = {
  lockThreshold: 5,
  ipLockThreshold: 20,
  lockWindowMs: 15 * 60 * 1000,
  sessionTtlMs: 12 * 60 * 60 * 1000,
  sessionRememberTtlMs: 7 * 24 * 60 * 60 * 1000,
};
