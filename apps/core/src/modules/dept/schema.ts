import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { appUsers } from '../user/schema.js';

export const depts = pgTable(
  'dept',
  {
    id: uuid('id').primaryKey(),
    parentId: uuid('parent_id'),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['company', 'department'] })
      .notNull()
      .default('department'),
    code: text('code').unique(),
    leaderId: uuid('leader_id').references((): AnyPgColumn => appUsers.id, { onDelete: 'restrict' }),
    headcount: integer('headcount'),
    sort: integer('sort').notNull().default(0),
    enabled: boolean('enabled').notNull().default(true),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.parentId], foreignColumns: [table.id] }).onDelete('restrict'),
    index('dept_parent_idx').on(table.parentId),
    index('dept_leader_idx').on(table.leaderId),
    uniqueIndex('dept_root_company_unique')
      .on(table.kind)
      .where(sql`${table.parentId} IS NULL AND ${table.kind} = 'company'`),
    check('dept_kind_check', sql`${table.kind} IN ('company', 'department')`),
    check(
      'dept_code_check',
      sql`${table.code} IS NULL OR (${table.code} = btrim(${table.code}) AND char_length(${table.code}) BETWEEN 1 AND 32)`,
    ),
    check('dept_headcount_check', sql`${table.headcount} IS NULL OR ${table.headcount} >= 0`),
  ],
);
