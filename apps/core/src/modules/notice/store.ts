import { and, eq, sql } from 'drizzle-orm';
import type { DbExec } from '../../kernel/context.js';
import { BizError } from '../../kernel/errors.js';
import { announcementStats } from '../message/api.js';
import { NoticeViewSchema } from './contract.js';
import { notices, type NoticeRow } from './schema.js';

export async function findNotice(db: DbExec, id: string) {
  const [row] = await db.select().from(notices).where(eq(notices.id, id));
  if (!row) throw new BizError('notice.not_found');
  return row;
}
export async function noticeView(db: DbExec, row: NoticeRow) {
  const stats = await announcementStats(db, row.id);
  return NoticeViewSchema.parse({
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    severity: row.severity,
    audience: row.audience,
    audienceIds: row.audienceIds,
    pinned: row.pinned,
    requireConfirmation: row.requireConfirmation,
    version: row.version,
    publisherName: row.publisherName,
    ...stats,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
  });
}
export function assertNoticeState(row: NoticeRow, version: number, states: string[]) {
  if (row.version !== version) throw new BizError('notice.version_conflict');
  if (!states.includes(row.status)) throw new BizError('notice.invalid_state');
}
export async function updateNoticeRow(
  db: DbExec,
  row: NoticeRow,
  now: Date,
  set: Partial<typeof notices.$inferInsert>,
) {
  const [updated] = await db
    .update(notices)
    .set({ ...set, version: sql`${notices.version} + 1`, updatedAt: now })
    .where(and(eq(notices.id, row.id), eq(notices.version, row.version), eq(notices.status, row.status)))
    .returning();
  if (!updated) {
    await findNotice(db, row.id);
    throw new BizError('notice.version_conflict');
  }
  return updated;
}
