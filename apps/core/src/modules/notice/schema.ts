import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { enumCheck } from '../../schema/check.js';
import { appUsers } from '../user/schema.js';
import { NOTICE_AUDIENCES, NOTICE_SEVERITIES, NOTICE_STATUSES } from './contract.js';

export const notices = pgTable(
  'notice',
  {
    id: uuid('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    status: text('status').notNull().default('draft'),
    severity: text('severity').notNull().default('normal'),
    audience: text('audience').notNull().default('all'),
    audienceIds: uuid('audience_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    pinned: boolean('pinned').notNull().default(false),
    requireConfirmation: boolean('require_confirmation').notNull().default(false),
    version: integer('version').notNull().default(0),
    publisherId: uuid('publisher_id').references(() => appUsers.id, { onDelete: 'restrict' }),
    publisherName: text('publisher_name'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'date' }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    check('notice_status_check', enumCheck(t.status, NOTICE_STATUSES)),
    check('notice_severity_check', enumCheck(t.severity, NOTICE_SEVERITIES)),
    check('notice_audience_check', enumCheck(t.audience, NOTICE_AUDIENCES)),
    check('notice_title_check', sql`char_length(btrim(${t.title})) BETWEEN 1 AND 120`),
    check('notice_content_check', sql`char_length(btrim(${t.content})) BETWEEN 1 AND 20000`),
    check('notice_version_check', sql`${t.version} >= 0`),
    check(
      'notice_targets_check',
      sql`(${t.audience} = 'all' AND cardinality(${t.audienceIds}) = 0) OR (${t.audience} <> 'all' AND cardinality(${t.audienceIds}) BETWEEN 1 AND 500)`,
    ),
    check('notice_schedule_check', sql`(${t.status} = 'scheduled') = (${t.scheduledAt} IS NOT NULL)`),
    index('notice_schedule_idx').on(t.status, t.scheduledAt),
  ],
);
export type NoticeRow = typeof notices.$inferSelect;
