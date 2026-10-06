import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { jobErrors } from '../errors.js';
import { JOB_PERMS } from '../permissions.js';
import * as z from 'zod';
import { JobDetailSchema, JobKeySchema } from '../contract.js';
import { nextRuns } from '../domain/cron.js';
import { jobView, requireJob } from '../store.js';
const definition = {
  route: { method: 'GET', path: '/jobs/{key}', summary: '定时任务详情' },
  meta: { perm: JOB_PERMS.view },
} satisfies SliceDefinition;
const inputSchema = z.object({ key: JobKeySchema }).strict();
const outputSchema = JobDetailSchema;
const errors = { ...commonErrorContracts, ...jobErrors };
export const queryJobDetail = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：scheduled_job / job_run 为系统配置与日志，非归属敏感表。
    const row = await requireJob(ctx.db, input.key);
    return { ...(await jobView(ctx.db, row)), nextRuns: nextRuns(row.cron, ctx.clock.now()) };
  });
