import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { enumCheck } from '../../schema/check.js';
import { menus } from '../menu/schema.js';
import { depts } from '../dept/schema.js';
import { ROLE_DATA_SCOPES, ROLE_TYPES } from './contract.js';
export {
  ROLE_DATA_SCOPES,
  ROLE_TYPES,
  RoleDataScopeSchema,
  RoleTypeSchema,
  type RoleType,
} from './contract.js';

export const roles = pgTable(
  'role',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull().unique(),

    type: text('type').notNull().default('custom'),
    description: text('description').notNull().default(''),
    enabled: boolean('enabled').notNull().default(true),
    dataScope: text('data_scope').notNull().default('self'),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    check('role_type_check', enumCheck(t.type, ROLE_TYPES)),
    check('role_data_scope_check', enumCheck(t.dataScope, ROLE_DATA_SCOPES)),
  ],
);

export const roleDepts = pgTable(
  'role_dept',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    deptId: uuid('dept_id')
      .notNull()
      .references(() => depts.id, { onDelete: 'restrict' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.deptId] }), index('role_dept_dept_idx').on(t.deptId)],
);

// 授权集合替换与角色版本推进同事务，关系行无需独立版本。
export const roleMenus = pgTable(
  'role_menu',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),

    menuId: uuid('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.menuId] }), index('role_menu_menu_idx').on(t.menuId)],
);
