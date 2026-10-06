import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { enumCheck } from '../../schema/check.js';
import { DICT_TONES } from './contract.js';

export const dictTypes = pgTable('dict_type', {
  id: uuid('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  remark: text('remark').notNull().default(''),
  builtin: boolean('builtin').notNull().default(false),
  enabled: boolean('enabled').notNull().default(true),
  version: integer('version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const dictItems = pgTable(
  'dict_item',
  {
    id: uuid('id').primaryKey(),
    typeId: uuid('type_id')
      .notNull()
      .references(() => dictTypes.id, { onDelete: 'restrict' }),
    value: text('value').notNull(),
    label: text('label').notNull(),
    tone: text('tone').notNull().default('neutral'),
    sort: integer('sort').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    enabled: boolean('enabled').notNull().default(true),
    remark: text('remark').notNull().default(''),
    builtin: boolean('builtin').notNull().default(false),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    uniqueIndex('dict_item_type_value_idx').on(t.typeId, t.value),
    uniqueIndex('dict_item_default_idx')
      .on(t.typeId)
      .where(sql`${t.isDefault} = true`),
    check('dict_item_tone_check', enumCheck(t.tone, DICT_TONES)),
  ],
);
