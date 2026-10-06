import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { notices } from '../notice/schema.js';
import { appUsers } from '../user/schema.js';

export const messages = pgTable(
  'inbox_message',
  {
    id: uuid('id').primaryKey(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'restrict' }),
    noticeId: uuid('notice_id').references(() => notices.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull().$type<'system' | 'announcement'>(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    senderName: text('sender_name').notNull(),
    severity: text('severity').notNull().default('normal').$type<'normal' | 'important' | 'urgent'>(),
    pinned: boolean('pinned').notNull().default(false),
    requireConfirmation: boolean('require_confirmation').notNull().default(false),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'date' }),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    firstReadAt: timestamp('first_read_at', { withTimezone: true, mode: 'date' }),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    index('message_recipient_created_idx').on(t.recipientId, t.createdAt, t.id),
    uniqueIndex('message_notice_recipient_idx').on(t.noticeId, t.recipientId),
    check('message_kind_check', sql`${t.kind} IN ('system', 'announcement')`),
    check('message_severity_check', sql`${t.severity} IN ('normal', 'important', 'urgent')`),
    check(
      'message_source_check',
      sql`(${t.kind} = 'system' AND ${t.noticeId} IS NULL) OR (${t.kind} = 'announcement' AND ${t.noticeId} IS NOT NULL)`,
    ),
  ],
);
export const messagePreferences = pgTable('message_preference', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => appUsers.id, { onDelete: 'restrict' }),
  badgeEnabled: boolean('badge_enabled').notNull().default(true),
});
