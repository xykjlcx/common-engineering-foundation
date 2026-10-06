import * as z from 'zod';

export const JOB_TIMEZONE = 'Asia/Shanghai';
export const JOB_TRIGGERS = ['scheduled', 'manual', 'retry'] as const;
export const JOB_RUN_STATUSES = ['success', 'failed'] as const;
export const JobKeySchema = z.string().min(1).max(100);
export const CronSchema = z.string().trim().min(9).max(120);
export const JobRunSchema = z.object({
  id: z.uuid(),
  jobKey: JobKeySchema,
  trigger: z.enum(JOB_TRIGGERS),
  attempt: z.number().int().min(0),
  status: z.enum(JOB_RUN_STATUSES),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
  durationMs: z.number().int().min(0),
  message: z.string(),
});
export const JobViewSchema = z.object({
  key: JobKeySchema,
  name: z.string(),
  description: z.string(),
  cron: CronSchema,
  timezone: z.literal(JOB_TIMEZONE),
  enabled: z.boolean(),
  version: z.number().int().min(0),
  maxRetries: z.number().int().min(0).max(3),
  retryDelayMinutes: z.number().int().min(1).max(60),
  timeoutSeconds: z.number().int().min(1).max(600),
  nextRunAt: z.iso.datetime().nullable(),
  retryAt: z.iso.datetime().nullable(),
  lastRun: JobRunSchema.nullable(),
});
export const JobDetailSchema = JobViewSchema.extend({ nextRuns: z.array(z.iso.datetime()) });
export const JobVersionSchema = z.object({ key: JobKeySchema, version: z.number().int().min(0) }).strict();
export const UpdateJobSchema = JobVersionSchema.extend({
  cron: CronSchema,
  maxRetries: z.number().int().min(0).max(3),
  retryDelayMinutes: z.number().int().min(1).max(60),
  timeoutSeconds: z.number().int().min(1).max(600),
});
export const SetJobEnabledSchema = JobVersionSchema.extend({ enabled: z.boolean() });
export const JobListInputSchema = z
  .object({
    keyword: z.string().trim().max(100).optional(),
    enabled: z.boolean().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  })
  .strict();
export const JobLogInputSchema = z
  .object({
    key: JobKeySchema.optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  })
  .strict();
export const JobPageSchema = z.object({
  list: z.array(JobViewSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const JobRunPageSchema = z.object({
  list: z.array(JobRunSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type JobView = z.infer<typeof JobViewSchema>;
export type JobRun = z.infer<typeof JobRunSchema>;
export type JobDetail = z.infer<typeof JobDetailSchema>;
export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;
