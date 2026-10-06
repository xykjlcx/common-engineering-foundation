import type { TxCtx } from '../../../kernel/context.js';
import { deliverAnnouncement } from '../../message/api.js';
import { getNoticeRecipients } from '../../user/api.js';
import { NoticeAudienceSchema, NoticeSeveritySchema } from '../contract.js';
import type { NoticeRow } from '../schema.js';
import { updateNoticeRow } from '../store.js';
import { assertAudience } from './audience.js';

export async function publishNoticeInTx(
  ctx: Pick<TxCtx, 'db' | 'clock' | 'idgen'>,
  row: NoticeRow,
  publisher: { id: string | null; name: string },
) {
  const audience = NoticeAudienceSchema.parse(row.audience);
  await assertAudience(ctx.db, audience, row.audienceIds);
  const updated = await updateNoticeRow(ctx.db, row, ctx.clock.now(), {
    status: 'published',
    publishedAt: ctx.clock.now(),
    scheduledAt: null,
    publisherId: publisher.id,
    publisherName: publisher.name,
  });
  const recipientIds = await getNoticeRecipients(ctx.db, ctx.clock.now(), audience, row.audienceIds);
  await deliverAnnouncement(ctx, {
    noticeId: row.id,
    recipientIds,
    title: row.title,
    content: row.content,
    senderName: publisher.name,
    severity: NoticeSeveritySchema.parse(row.severity),
    pinned: row.pinned,
    requireConfirmation: row.requireConfirmation,
  });
  return updated;
}
