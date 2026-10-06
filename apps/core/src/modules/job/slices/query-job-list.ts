import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { jobErrors } from '../errors.js';
import { JOB_PERMS } from '../permissions.js';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { JobListInputSchema, JobPageSchema } from '../contract.js';
import { registeredJobs } from '../domain/registry.js';
import { jobs } from '../schema.js';
import { jobView } from '../store.js';
const definition = {
  route: { method: 'GET', path: '/jobs', summary: '定时任务列表' },
  meta: { perm: JOB_PERMS.view },
} satisfies SliceDefinition;
const inputSchema = JobListInputSchema;
const outputSchema = JobPageSchema;
const errors = { ...commonErrorContracts, ...jobErrors };
export const queryJobList = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：scheduled_job / job_run 为系统配置与日志，非归属敏感表。
    const keys = registeredJobs
      .filter(
        (item) =>
          !input.keyword ||
          `${item.name} ${item.description} ${item.key}`.toLowerCase().includes(input.keyword.toLowerCase()),
      )
      .map((item) => item.key);
    const where = and(
      inArray(jobs.key, keys),
      input.enabled === undefined ? undefined : eq(jobs.enabled, input.enabled),
    );
    const rows = await ctx.db
      .select()
      .from(jobs)
      .where(where)
      .orderBy(asc(jobs.key))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);
    const [total] = await ctx.db.select({ value: count() }).from(jobs).where(where);
    const list = await Promise.all(rows.map((row) => jobView(ctx.db, row)));
    return { list, total: total?.value ?? 0, page: input.page, pageSize: input.pageSize };
  });
