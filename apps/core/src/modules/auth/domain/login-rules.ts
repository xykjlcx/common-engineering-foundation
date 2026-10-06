import { BizError } from '../../../kernel/errors.js';
import { DEFAULT_RUNTIME_POLICY, type RuntimePolicy } from '../../../kernel/policy.js';
import type { UserStatus } from '../../user/schema.js';

// 账号锁定只累计 bad_credentials，锁定尝试不延长窗口。
// IP 限速为软限制；按 IP 串行会阻塞共享 NAT 出口的合法账号。

export const LOCKOUT_WINDOW_MS = DEFAULT_RUNTIME_POLICY.lockWindowMs;
export const ACCOUNT_LOCK_THRESHOLD = DEFAULT_RUNTIME_POLICY.lockThreshold;
export const IP_LOCK_THRESHOLD = DEFAULT_RUNTIME_POLICY.ipLockThreshold;

export const LOGIN_EVENT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

export interface LockFacts {
  accountFailures: number;
  /** 窗口内该 IP 的 bad_credentials 失败数（无 IP 时传 0） */
  ipFailures: number;
}

export type LockKind = 'account_locked' | 'ip_locked' | null;

export function lockDecision(facts: LockFacts, policy: RuntimePolicy = DEFAULT_RUNTIME_POLICY): LockKind {
  if (facts.accountFailures >= policy.lockThreshold) return 'account_locked';
  if (facts.ipFailures >= policy.ipLockThreshold) return 'ip_locked';
  return null;
}

export function retryAfterSeconds(
  newestFailureAt: Date,
  now: Date,
  windowMs: number = DEFAULT_RUNTIME_POLICY.lockWindowMs,
): number {
  const ms = newestFailureAt.getTime() + windowMs - now.getTime();
  return Math.max(1, Math.ceil(ms / 1000));
}

export function assertUserCanLogin(user: { status: UserStatus; effectiveAt?: Date | null }, now: Date): void {
  if (user.effectiveAt && user.effectiveAt > now) throw new BizError('auth.user_not_effective');
  switch (user.status) {
    case 'active':
      return;
    case 'disabled':
      throw new BizError('auth.user_disabled');
  }
}
