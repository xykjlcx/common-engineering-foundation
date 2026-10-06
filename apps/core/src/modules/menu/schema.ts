import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { enumCheck } from '../../schema/check.js';

import { MENU_TYPES } from './tree-contract.js';
export { MENU_TYPES, MenuTypeSchema, type MenuType } from './tree-contract.js';

export const menus = pgTable(
  'menu',
  {
    id: uuid('id').primaryKey(),
    /** 代码目录稳定身份；null 仅表示运行期展示目录。不可由 HTTP 入参设置。 */
    catalogIdentity: text('catalog_identity').unique(),
    // 自关联树；restrict：有子节点的节点禁删（应用层 409 是友好路径，FK 是并发下的最后一道闸）
    parentId: uuid('parent_id').references((): AnyPgColumn => menus.id, { onDelete: 'restrict' }),
    subsystemKey: text('subsystem_key').notNull().default('admin'),
    type: text('type').notNull(),

    label: jsonb('label').$type<Record<string, string>>().notNull(),
    icon: text('icon'),
    path: text('path'),
    /** 权限点全局唯一标识（冒号码，如 iam:user:create）；可空唯一——PG 对 NULL 不判重 */
    permCode: text('perm_code').unique(),
    visible: boolean('visible').notNull().default(true),
    sort: integer('sort').notNull().default(0),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    index('menu_parent_idx').on(t.parentId),
    check('menu_type_check', enumCheck(t.type, MENU_TYPES)),

    check('menu_action_perm_check', sql`${t.type} <> 'action' or ${t.permCode} is not null`),
  ],
);
