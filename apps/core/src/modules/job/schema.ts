import { boolean, check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { enumCheck } from '../../schema/check.js';
import { JOB_RUN_STATUSES, JOB_TRIGGERS } from './contract.js';

export const jobs = pgTable('scheduled_job', {
  key: text('key').primaryKey(),
  cron: text('cron').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  version: integer('version').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(0),
  retryDelayMinutes: integer('retry_delay_minutes').notNull().default(5),
  timeoutSeconds: integer('timeout_seconds').notNull().default(60),
  nextRunAt: timestamp('next_run_at', { withTimezone: true, mode: 'date' }),
  retryAt: timestamp('retry_at', { withTimezone: true, mode: 'date' }),
  retryAttempt: integer('retry_attempt').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});
export const jobRuns = pgTable(
  'job_run',
  {
    id: uuid('id').primaryKey(),
    jobKey: text('job_key')
      .notNull()
      .references(() => jobs.key),
    trigger: text('trigger').notNull(),
    attempt: integer('attempt').notNull(),
    status: text('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }).notNull(),
    durationMs: integer('duration_ms').notNull(),
    message: text('message').notNull(),
  },
  (t) => [
    index('job_run_key_started_idx').on(t.jobKey, t.startedAt),
    check('job_run_trigger_check', enumCheck(t.trigger, JOB_TRIGGERS)),
    check('job_run_status_check', enumCheck(t.status, JOB_RUN_STATUSES)),
  ],
);
