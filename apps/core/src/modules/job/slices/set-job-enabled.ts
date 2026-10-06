import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { jobErrors } from '../errors.js';
import { JOB_PERMS } from '../permissions.js';
import { eq } from 'drizzle-orm';
import { runCommand } from '../../../kernel/command.js';
import { JobViewSchema, SetJobEnabledSchema } from '../contract.js';
import { nextRuns } from '../domain/cron.js';
import { jobs } from '../schema.js';
import { jobView, lockJob } from '../store.js';
const definition = {
  route: { method: 'POST', path: '/jobs/{key}/enabled', summary: '启停任务' },
  meta: { perm: JOB_PERMS.update },
} satisfies SliceDefinition;
const inputSchema = SetJobEnabledSchema;
const outputSchema = JobViewSchema;
const errors = { ...commonErrorContracts, ...jobErrors };
export const setJobEnabled = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：scheduled_job / job_run 为系统配置与日志，非归属敏感表。
    return runCommand(ctx, async (txCtx) => {
      const before = await lockJob(txCtx.db, input.key, input.version);
      const [after] = await txCtx.db
        .update(jobs)
        .set({
          enabled: input.enabled,
          version: before.version + 1,
          updatedAt: ctx.clock.now(),
          nextRunAt: input.enabled ? new Date(nextRuns(before.cron, ctx.clock.now())[0]!) : null,
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
