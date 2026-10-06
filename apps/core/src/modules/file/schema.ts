import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// 本地对象存储事实，不引用 user schema；绑定归属由 user 事务和读取策略确认。
// version豁免：上传、绑定与清理均持行锁；生命周期不提供可任意编辑入口。
export const files = pgTable(
  'stored_file',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    purpose: text('purpose').notNull().default('avatar'),
    status: text('status').notNull().default('staging'),
    storageKey: text('storage_key').notNull().unique(),
    mimeType: text('mime_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    stagedAt: timestamp('staged_at', { withTimezone: true, mode: 'date' }),
    boundAt: timestamp('bound_at', { withTimezone: true, mode: 'date' }),
    boundUserId: uuid('bound_user_id'),
  },
  (t) => [
    index('stored_file_owner_idx').on(t.ownerId),
    index('stored_file_cleanup_idx')
      .on(sql`coalesce(${t.stagedAt}, ${t.createdAt})`, t.id)
      .where(
        sql`${t.purpose} = 'avatar' AND ${t.status} IN ('staging', 'staged', 'failed', 'deleting') AND ${t.boundUserId} IS NULL AND ${t.boundAt} IS NULL`,
      ),
    check('stored_file_purpose_check', sql`${t.purpose} = 'avatar'`),
    check(
      'stored_file_status_check',
      sql`${t.status} IN ('staging', 'staged', 'bound', 'failed', 'deleting', 'deleted')`,
    ),
    check('stored_file_size_check', sql`${t.byteSize} > 0 AND ${t.byteSize} <= 2097152`),
    check(
      'stored_file_binding_check',
      sql`(${t.status} = 'bound') = (${t.boundUserId} IS NOT NULL AND ${t.boundAt} IS NOT NULL)`,
    ),
  ],
);
