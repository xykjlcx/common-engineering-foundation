import type { DbExec } from './context.js';
import { BizError, KERNEL_ERROR_CODES } from './errors.js';

export type TenantStatus = 'active' | 'suspended' | 'closed';

/** 租户状态数据源——由派生项目的租户表实现注入 */
export interface TenantStatusSource {
  loadStatus(db: DbExec, tenantId: string): Promise<TenantStatus | null>;
}

/**
 * 租户状态闸：suspended / closed 时一切 mutation 拦截、query 放行
 * （暂停仍允许登录查数；关闭只读归档）。配套纪律：状态变更**不批量吊销会话**
 * ——吊销会挡住"登录查数"，由本闸拦 mutation 即可。
 */
export function createTenantGate(source: TenantStatusSource) {
  return async function assertTenantGate(db: DbExec, tenantId: string, isMutation: boolean): Promise<void> {
    const status = await source.loadStatus(db, tenantId);
    if (status === null) throw new BizError(KERNEL_ERROR_CODES.SESSION_INVALID);
    if (!isMutation) return;
    if (status === 'suspended') throw new BizError(KERNEL_ERROR_CODES.TENANT_SUSPENDED, { tenantId });
    if (status === 'closed') throw new BizError(KERNEL_ERROR_CODES.TENANT_CLOSED, { tenantId });
  };
}
