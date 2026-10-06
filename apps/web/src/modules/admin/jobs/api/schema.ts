import type { AppRouterClient } from '@keel/core/client';
export { UpdateJobSchema } from '@keel/core/job-contract';
export type JobDto = Awaited<ReturnType<AppRouterClient['job']['list']>>['list'][number];
export type JobDetailDto = Awaited<ReturnType<AppRouterClient['job']['detail']>>;
export type JobRunDto = Awaited<ReturnType<AppRouterClient['job']['run']>>;
export type JobListParams = Parameters<AppRouterClient['job']['list']>[0];
export type JobLogParams = Parameters<AppRouterClient['job']['logs']>[0];
