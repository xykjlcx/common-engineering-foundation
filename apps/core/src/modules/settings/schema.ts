import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { SettingsValues } from './contract.js';

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  values: jsonb('values').$type<SettingsValues>().notNull(),
  version: integer('version').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});
