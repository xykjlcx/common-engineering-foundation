import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import * as z from 'zod';
import { enumCheck } from '../../schema/check.js';
import { depts } from '../dept/schema.js';
import { files } from '../file/schema.js';
import { posts } from '../post/schema.js';
import { roles } from '../role/schema.js';
export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const UserStatusSchema = z.enum(USER_STATUSES);

export const appUsers = pgTable(
  'app_user',
  {
    id: uuid('id').primaryKey(),
    username: text('username').notNull().unique(),
    name: text('name').notNull(),
    email: text('email').unique(),
    phone: text('phone').notNull().default(''),
    deptId: uuid('dept_id').references(() => depts.id, { onDelete: 'restrict' }),
    managerId: uuid('manager_id'),
    avatarId: uuid('avatar_id').references(() => files.id, { onDelete: 'restrict' }),
    employeeNo: text('employee_no').unique(),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'restrict' }),
    gender: text('gender'),
    employmentType: text('employment_type'),
    employmentStatus: text('employment_status'),
    joinedAt: date('joined_at'),
    workLocation: text('work_location'),
    remark: text('remark'),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
    effectiveAt: timestamp('effective_at', { withTimezone: true, mode: 'date' }),
    passwordHash: text('password_hash').notNull(),
    status: text('status').notNull().default('active'),
    isSystemAdmin: boolean('is_system_admin').notNull().default(false),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    foreignKey({ columns: [t.managerId], foreignColumns: [t.id] }).onDelete('restrict'),
    check('app_user_manager_not_self', sql`${t.managerId} IS NULL OR ${t.managerId} <> ${t.id}`),
    index('app_user_dept_idx').on(t.deptId),
    index('app_user_status_idx').on(t.status),
    // 大小写无关的邮箱唯一性（DB 级保证）：应用层已归一小写，本索引挡住绕过应用层的写入路径
    uniqueIndex('app_user_email_lower_idx').on(sql`lower(${t.email})`),
    // 用户名唯一索引忽略大小写，约束绕过应用归一的写入。
    uniqueIndex('app_user_username_lower_idx').on(sql`lower(${t.username})`),
    check(
      'app_user_employment_status_check',
      sql`${t.employmentStatus} IS NULL OR ${t.employmentStatus} IN ('probation', 'active', 'left')`,
    ),
    check('app_user_gender_check', sql`${t.gender} IS NULL OR ${t.gender} IN ('male', 'female', 'other')`),
    check('app_user_status_check', enumCheck(t.status, USER_STATUSES)),
  ],
);

export const userRoles = pgTable(
  'user_role',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    // restrict：把「角色被用户占用时禁止删除」变成数据库级保证——应用层的 409 是友好路径，
    // FK 是并发下的最后一道闸（否则 cascade 会在竞态里静默解绑用户的角色）
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    /** 历史未知来源保持 null；后续授予记录真实操作者，注销账号保留引用。 */
    grantedBy: uuid('granted_by').references(() => appUsers.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] }), index('user_role_role_idx').on(t.roleId)],
);
