import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { jobErrors } from '../errors.js';
import { JOB_PERMS } from '../permissions.js';
import { JobRunSchema, JobVersionSchema } from '../contract.js';
import { runJob } from '../domain/execution.js';
const definition = {
  route: { method: 'POST', path: '/jobs/{key}/run', summary: '立即执行任务' },
  meta: { perm: JOB_PERMS.run },
} satisfies SliceDefinition;
const inputSchema = JobVersionSchema;
const outputSchema = JobRunSchema;
const errors = { ...commonErrorContracts, ...jobErrors };
export const runJobNow = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：scheduled_job / job_run 为系统配置与日志，非归属敏感表。
    const result = await runJob(ctx, input.key, input.version);
    ctx.audit.capture({ objectType: 'job', objectId: input.key, before: null, after: result });
    return result;
  });
