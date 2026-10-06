import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Clock } from '../../kernel/clock.js';
import type { Db } from '../../kernel/db.js';
import { files } from './schema.js';
import { deleteAvatarObject } from './storage.js';

export const AVATAR_STAGING_RETENTION_MS = 24 * 60 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 100;

function failureCode(error: unknown): string {
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[a-zA-Z0-9_.]{1,80}$/.test(error.code)
  )
    return error.code;
  return 'FILE_CLEANUP_FAILED';
}

/**
 * 每次至多 100 个未绑定对象。认领单独提交，磁盘失败时 deleting 仍可回查/重试。
 * 维护入口必须传根 Db，不能包裹在外层事务中，否则认领未独立提交。
 */
export async function cleanupExpiredAvatars(db: Db, clock: Clock) {
  const cutoff = new Date(clock.now().getTime() - AVATAR_STAGING_RETENTION_MS);
  const expiredAt = sql`coalesce(${files.stagedAt}, ${files.createdAt})`;
  const unbound = and(eq(files.purpose, 'avatar'), isNull(files.boundUserId), isNull(files.boundAt));
  const candidates = await db.transaction(async (tx) => {
    const selected = await tx
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          unbound,
          inArray(files.status, ['staging', 'staged', 'failed', 'deleting']),
          sql`${expiredAt} <= ${cutoff.toISOString()}`,
        ),
      )
      .orderBy(asc(expiredAt), asc(files.id))
      .limit(CLEANUP_BATCH_SIZE)
      .for('update', { skipLocked: true });
    if (selected.length > 0)
      await tx
        .update(files)
        .set({ status: 'deleting' })
        .where(
          inArray(
            files.id,
            selected.map((row) => row.id),
          ),
        );
    return selected;
  });
  const report: { deleted: number; failures: { id: string; code: string }[] } = { deleted: 0, failures: [] };
  for (const { id } of candidates) {
    try {
      const deleted = await db.transaction(async (tx) => {
        const [file] = await tx
          .select({ storageKey: files.storageKey })
          .from(files)
          .where(and(eq(files.id, id), eq(files.status, 'deleting'), unbound))
          .for('update', { skipLocked: true })
          .limit(1);
        if (!file) return false;
        // 单对象锁覆盖 unlink + 终态写入，另一个 worker 不能处理同一个对象。
        await deleteAvatarObject(file.storageKey);
        await tx.update(files).set({ status: 'deleted' }).where(eq(files.id, id));
        return true;
      });
      if (deleted) report.deleted += 1;
    } catch (error) {
      // 只返回 id 和错误码；OS 错误中可能含部署目录，不进入维护输出。
      report.failures.push({ id, code: failureCode(error) });
    }
  }
  return report;
}
