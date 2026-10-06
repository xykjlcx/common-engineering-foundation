import { z } from 'zod';
import type { TFunction } from 'i18next';
import { BizError } from '@/lib/http/errors';
import type { JobDto } from './api/schema';
export const jobsSearchSchema = z.object({
  keyword: z.string().max(100).catch(''),
  enabled: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().optional().catch(undefined),
  ),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});
export function jobFormValues(job: JobDto) {
  return {
    cron: job.cron,
    maxRetries: job.maxRetries,
    retryDelayMinutes: job.retryDelayMinutes,
    timeoutSeconds: job.timeoutSeconds,
  };
}
export function jobTime(value: string | null, language = 'zh-CN') {
  if (!value) return '—';
  return new Intl.DateTimeFormat(language, {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
export function jobError(error: unknown, t: TFunction<'admin'>) {
  if (error instanceof BizError) {
    if (error.code === 'job.busy') return t('jobs.errors.busy');
    if (error.status === 409) return t('jobs.errors.conflict');
    if (error.status === 404) return t('jobs.errors.notFound');
    if (error.status === 403) return t('jobs.errors.denied');
    if (error.status === 400 || error.status === 422) return t('jobs.errors.invalid');
  }
  return t('jobs.errors.failed');
}
export const cronPresets = [
  { key: 'hourly', cron: '0 * * * *' },
  { key: 'daily', cron: '0 2 * * *' },
  { key: 'weekly', cron: '0 2 * * 1' },
  { key: 'monthly', cron: '0 2 1 * *' },
] as const;
