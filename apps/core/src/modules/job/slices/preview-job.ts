import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { jobErrors } from '../errors.js';
import { JOB_PERMS } from '../permissions.js';
import * as z from 'zod';
import { CronSchema } from '../contract.js';
import { nextRuns } from '../domain/cron.js';
const definition = {
  route: { method: 'POST', path: '/jobs/preview', summary: '预览执行时间' },
  meta: { perm: JOB_PERMS.view },
} satisfies SliceDefinition;
const inputSchema = z.object({ cron: CronSchema }).strict();
const outputSchema = z.object({ nextRuns: z.array(z.iso.datetime()) });
const errors = { ...commonErrorContracts, ...jobErrors };
export const previewJob = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(({ context: ctx, input }) => {
    // ③豁免：scheduled_job / job_run 为系统配置与日志，非归属敏感表。
    return { nextRuns: nextRuns(input.cron, ctx.clock.now()) };
  });
