import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import type { Clock } from '../../../kernel/clock.js';
import type { TxExec } from '../../../kernel/context.js';
import type { Db } from '../../../kernel/db.js';
import type { Logger } from '../../../kernel/logger.js';
import { JobRunSchema, type JobRun } from '../contract.js';
import { jobs, jobRuns } from '../schema.js';
import { lockJob, type JobRow } from '../store.js';
import { nextRuns } from './cron.js';
import { registeredJob, registeredJobs, type JobHandler } from './registry.js';

export interface JobEnvironment {
  db: Db;
  clock: Clock;
  idgen: () => string;
  logger: Logger;
}

export async function ensureRegisteredJobs(env: Pick<JobEnvironment, 'db' | 'clock'>) {
  for (const definition of registeredJobs) {
    await env.db
      .insert(jobs)
      .values({ key: definition.key, cron: definition.cron, updatedAt: env.clock.now() })
      .onConflictDoNothing();
  }
}

export async function executeLockedJob(
  env: Omit<JobEnvironment, 'db'>,
  tx: TxExec,
  row: JobRow,
  trigger: JobRun['trigger'],
  handler: JobHandler = registeredJob(row.key).handler,
): Promise<JobRun> {
  const startedAt = env.clock.now();
  const attempt = trigger === 'retry' ? row.retryAttempt : 0;
  let status: JobRun['status'] = 'success';
  let message: string;
  // 保存点隔离业务写入；失败日志和下次重试仍由外层持锁事务提交。
  await tx.execute(sql`SAVEPOINT job_work`);
  try {
    await tx.execute(sql`select set_config('statement_timeout', ${`${String(row.timeoutSeconds)}s`}, true)`);
    message = await handler(tx, env.clock);
    await tx.execute(sql`RELEASE SAVEPOINT job_work`);
  } catch (error) {
    await tx.execute(sql`ROLLBACK TO SAVEPOINT job_work`);
    await tx.execute(sql`RELEASE SAVEPOINT job_work`);
    status = 'failed';
    message = '执行失败，数据库变更已回滚；请联系管理员查看服务日志';
    env.logger.error({ err: error, jobKey: row.key, trigger, attempt }, 'scheduled job failed');
  }
  await tx.execute(sql`select set_config('statement_timeout', '0', true)`);
  const finishedAt = env.clock.now();
  const result = JobRunSchema.parse({
    id: env.idgen(),
    jobKey: row.key,
    trigger,
    attempt,
    status,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    message,
  });
  await tx.insert(jobRuns).values({ ...result, startedAt, finishedAt });
  const retry = status === 'failed' && row.enabled && attempt < row.maxRetries;
  await tx
    .update(jobs)
    .set({
      ...(trigger === 'scheduled' ? { nextRunAt: new Date(nextRuns(row.cron, finishedAt)[0]!) } : {}),
      retryAt: retry ? new Date(finishedAt.getTime() + row.retryDelayMinutes * 60_000) : null,
      retryAttempt: retry ? attempt + 1 : 0,
    })
    .where(eq(jobs.key, row.key));
  return result;
}

export async function runJob(env: JobEnvironment, key: string, version: number) {
  return env.db.transaction(async (tx) => {
    const row = await lockJob(tx, key, version);
    return executeLockedJob(env, tx, row, 'manual');
  });
}

export async function tickJobs(env: JobEnvironment): Promise<number> {
  let executed = 0;
  for (const definition of registeredJobs) {
    const ran = await env.db.transaction(async (tx) => {
      const now = env.clock.now();
      const [row] = await tx
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.key, definition.key),
            eq(jobs.enabled, true),
            or(lte(jobs.retryAt, now), and(isNull(jobs.retryAt), lte(jobs.nextRunAt, now))),
          ),
        )
        .orderBy(asc(jobs.key))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!row) return false;
      const trigger = row.retryAt && row.retryAt <= now ? 'retry' : 'scheduled';
      await executeLockedJob(env, tx, row, trigger);
      return true;
    });
    if (ran) executed++;
  }
  return executed;
}

export function startJobScheduler(env: JobEnvironment, intervalMs = 1000) {
  let stopped = false;
  let inFlight: Promise<void> | undefined;
  const tick = () => {
    if (stopped || inFlight) return;
    inFlight = tickJobs(env)
      .then(() => undefined)
      .catch((error: unknown) => {
        env.logger.error({ err: error }, 'job scheduler tick failed');
      })
      .finally(() => {
        inFlight = undefined;
      });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  tick();
  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await inFlight;
    },
  };
}
