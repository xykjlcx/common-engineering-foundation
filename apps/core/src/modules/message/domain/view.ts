import type { messages } from '../schema.js';

export function messageView(row: typeof messages.$inferSelect) {
  return {
    id: row.id,
    noticeId: row.noticeId,
    kind: row.kind,
    title: row.title,
    content: row.content,
    senderName: row.senderName,
    severity: row.severity,
    pinned: row.pinned,
    requireConfirmation: row.requireConfirmation,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}
