import type { DbExec } from '../../../kernel/context.js';
import { noticeRecipientsRaw } from '../scoped.js';

export async function getNoticeRecipients(
  db: DbExec,
  now: Date,
  audience: 'all' | 'departments' | 'roles',
  ids: string[],
) {
  const rows = await noticeRecipientsRaw(db, now, audience, ids);
  return rows.map((row) => row.id);
}
