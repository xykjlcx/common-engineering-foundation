import { sql } from 'drizzle-orm';
import type { TxExec } from '../../../kernel/context.js';

/** 部门树变更和删除共用事务锁，避免并发调整父级制造环。 */
export async function lockDepartmentTree(tx: TxExec): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(3, 1)`);
}
