import { desc, eq } from 'drizzle-orm';
import type { DbExec } from '../../kernel/context.js';
import { BizError } from '../../kernel/errors.js';
import { JOB_TIMEZONE, JobRunSchema, type JobView } from './contract.js';
import { registeredJob } from './domain/registry.js';
import { jobs, jobRuns } from './schema.js';

export type JobRow = typeof jobs.$inferSelect;
export function runView(row: typeof jobRuns.$inferSelect) {
  return JobRunSchema.parse({
    ...row,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt.toISOString(),
  });
}
export async function jobView(db: DbExec, row: JobRow): Promise<JobView> {
  const definition = registeredJob(row.key);
  const [last] = await db
    .select()
    .from(jobRuns)
    .where(eq(jobRuns.jobKey, row.key))
    .orderBy(desc(jobRuns.startedAt), desc(jobRuns.id))
    .limit(1);
  return {
    key: row.key,
    name: definition.name,
    description: definition.description,
    cron: row.cron,
    timezone: JOB_TIMEZONE,
    enabled: row.enabled,
    version: row.version,
    maxRetries: row.maxRetries,
    retryDelayMinutes: row.retryDelayMinutes,
    timeoutSeconds: row.timeoutSeconds,
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    retryAt: row.retryAt?.toISOString() ?? null,
    lastRun: last ? runView(last) : null,
  };
}
export async function requireJob(db: DbExec, key: string) {
  registeredJob(key);
  const [row] = await db.select().from(jobs).where(eq(jobs.key, key));
  if (!row) throw new BizError('job.not_found', { key });
  return row;
}
export async function lockJob(db: DbExec, key: string, version: number) {
  registeredJob(key);
  const [row] = await db.select().from(jobs).where(eq(jobs.key, key)).for('update', { skipLocked: true });
  if (!row) {
    await requireJob(db, key);
    throw new BizError('job.busy', { key });
  }
  if (row.version !== version) throw new BizError('job.version_conflict', { key });
  return row;
}
