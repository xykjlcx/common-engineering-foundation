import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { jobErrors } from '../errors.js';
import { JOB_PERMS } from '../permissions.js';
import { eq } from 'drizzle-orm';
import { runCommand } from '../../../kernel/command.js';
import { JobViewSchema, UpdateJobSchema } from '../contract.js';
import { nextRuns } from '../domain/cron.js';
import { jobs } from '../schema.js';
import { jobView, lockJob } from '../store.js';
const definition = {
  route: { method: 'PATCH', path: '/jobs/{key}', summary: '更新任务配置' },
  meta: { perm: JOB_PERMS.update },
} satisfies SliceDefinition;
const inputSchema = UpdateJobSchema;
const outputSchema = JobViewSchema;
const errors = { ...commonErrorContracts, ...jobErrors };
export const updateJob = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：scheduled_job / job_run 为系统配置与日志，非归属敏感表。
    const times = nextRuns(input.cron, ctx.clock.now());
    return runCommand(ctx, async (txCtx) => {
      const before = await lockJob(txCtx.db, input.key, input.version);
      const [after] = await txCtx.db
        .update(jobs)
        .set({
          cron: input.cron,
          maxRetries: input.maxRetries,
          retryDelayMinutes: input.retryDelayMinutes,
          timeoutSeconds: input.timeoutSeconds,
          version: before.version + 1,
          updatedAt: ctx.clock.now(),
          nextRunAt: before.enabled ? new Date(times[0]!) : null,
          retryAt: null,
          retryAttempt: 0,
        })
        .where(eq(jobs.key, input.key))
        .returning();
      if (!after) throw new Error('job update returned no row');
      ctx.audit.capture({ objectType: 'job', objectId: input.key, before, after });
      return outputSchema.parse(await jobView(txCtx.db, after));
    });
  });
