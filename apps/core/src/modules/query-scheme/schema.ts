import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { appUsers } from '../user/schema.js';

// 查询方案只保存查询表达式；owner 与共享范围由服务端给定，永不接受客户端ownerId。
export const querySchemes = pgTable(
  'user_filter_scheme',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'restrict' }),
    resource: text('resource').notNull().default('users'),
    name: text('name').notNull(),
    filters: text('filters').notNull(),
    scope: text('scope').notNull().default('mine'),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    uniqueIndex('user_scheme_owner_name_idx').on(t.ownerId, t.resource, t.name),
    check('user_scheme_scope_check', sql`${t.scope} IN ('mine', 'shared')`),
  ],
);
