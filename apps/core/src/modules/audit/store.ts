import { desc, lte } from 'drizzle-orm';
import { OperationSchema } from './contract.js';
import type { DbExec } from '../../kernel/context.js';
import { auditLogs } from '../../schema/index.js';
import { getAuditIdentities } from '../user/api.js';

export const operationColumns = {
  id: auditLogs.id,
  actorUserId: auditLogs.actorUserId,
  isImpersonation: auditLogs.isImpersonation,
  action: auditLogs.action,
  outcome: auditLogs.outcome,
  errorCode: auditLogs.errorCode,
  objectType: auditLogs.objectType,
  objectId: auditLogs.objectId,
  ip: auditLogs.ip,
  traceId: auditLogs.traceId,
  createdAt: auditLogs.createdAt,
};

type OperationRow = Pick<typeof auditLogs.$inferSelect, keyof typeof operationColumns>;

export async function operationViews(db: DbExec, rows: readonly OperationRow[]) {
  const identities = await getAuditIdentities(db, [
    ...new Set(rows.flatMap((row) => (row.actorUserId ? [row.actorUserId] : []))),
  ]);

  return rows.map(({ createdAt, ...row }) =>
    OperationSchema.parse({
      ...row,
      actorName: row.actorUserId ? (identities.get(row.actorUserId)?.name ?? row.actorUserId) : '—',
      createdAt: createdAt.toISOString(),
    }),
  );
}

export async function getRecentOperations(db: DbExec, now: Date, limit: number) {
  const rows = await db
    .select(operationColumns)
    .from(auditLogs)
    .where(lte(auditLogs.createdAt, now))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit);
  return operationViews(db, rows);
}
