import type { JobListParams, JobLogParams } from './schema';
export const jobKeys = {
  all: ['sys', 'jobs'] as const,
  list: (params: JobListParams) => [...jobKeys.all, 'list', params] as const,
  detail: (key: string) => [...jobKeys.all, 'detail', key] as const,
  preview: (cron: string) => [...jobKeys.all, 'preview', cron] as const,
  logs: (params: JobLogParams) => [...jobKeys.all, 'logs', params] as const,
};
