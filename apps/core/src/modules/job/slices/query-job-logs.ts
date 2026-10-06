import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { jobErrors } from '../errors.js';
import { JOB_PERMS } from '../permissions.js';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { JobLogInputSchema, JobRunPageSchema } from '../contract.js';
import { registeredJobs } from '../domain/registry.js';
import { jobRuns } from '../schema.js';
import { requireJob, runView } from '../store.js';
const definition = {
  route: { method: 'GET', path: '/job-runs', summary: '任务执行记录' },
  meta: { perm: JOB_PERMS.view },
} satisfies SliceDefinition;
const inputSchema = JobLogInputSchema;
const outputSchema = JobRunPageSchema;
const errors = { ...commonErrorContracts, ...jobErrors };
export const queryJobLogs = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：scheduled_job / job_run 为系统配置与日志，非归属敏感表。
    if (input.key) await requireJob(ctx.db, input.key);
    const where = input.key
      ? eq(jobRuns.jobKey, input.key)
      : inArray(
          jobRuns.jobKey,
          registeredJobs.map((item) => item.key),
        );
    const rows = await ctx.db
      .select()
      .from(jobRuns)
      .where(where)
      .orderBy(desc(jobRuns.startedAt), desc(jobRuns.id))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);
    const [total] = await ctx.db.select({ value: count() }).from(jobRuns).where(where);
    return { list: rows.map(runView), total: total?.value ?? 0, page: input.page, pageSize: input.pageSize };
  });
