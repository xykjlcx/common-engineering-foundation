import { z } from 'zod';
import type { CreateNoticeSchema } from '@keel/core/notice-contract';
import { BizError } from '@/lib/http/errors';
export const noticesSearchSchema = z.object({
  keyword: z.string().catch(''),
  status: z.enum(['all', 'draft', 'scheduled', 'published', 'withdrawn']).catch('all'),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});
export function noticeListParams(search: z.infer<typeof noticesSearchSchema>) {
  return {
    ...search,
    keyword: search.keyword || undefined,
    status: search.status === 'all' ? undefined : search.status,
  };
}
export function readingRate(readCount: number, recipientCount: number) {
  return recipientCount === 0 ? 0 : Math.round((readCount / recipientCount) * 100);
}
export function scheduledIso(localValue: string, now = Date.now()) {
  const timestamp = new Date(localValue).getTime();
  return Number.isFinite(timestamp) && timestamp > now ? new Date(timestamp).toISOString() : null;
}
export function noticeErrorKey(error: unknown) {
  if (error instanceof BizError) {
    if (error.code.includes('version_conflict')) return 'notices.errors.versionConflict';
    if (error.code.includes('invalid_state')) return 'notices.errors.invalidState';
    if (error.code.includes('audience')) return 'notices.errors.audience';
    if (error.status === 403) return 'notices.errors.denied';
  }
  return 'notices.errors.saveFailed';
}

type NoticeFields = z.output<typeof CreateNoticeSchema>;
export function buildNoticePatch(baseline: NoticeFields, values: NoticeFields): Partial<NoticeFields> | null {
  const previousTargets = new Set(baseline.audienceIds);
  const nextTargets = new Set(values.audienceIds);
  const sameTargets =
    previousTargets.size === nextTargets.size && [...nextTargets].every((id) => previousTargets.has(id));
  const patch: Partial<NoticeFields> = {
    ...(values.title !== baseline.title ? { title: values.title } : {}),
    ...(values.content !== baseline.content ? { content: values.content } : {}),
    ...(values.severity !== baseline.severity ? { severity: values.severity } : {}),
    ...(values.audience !== baseline.audience ? { audience: values.audience } : {}),
    ...(!sameTargets ? { audienceIds: values.audienceIds } : {}),
    ...(values.pinned !== baseline.pinned ? { pinned: values.pinned } : {}),
    ...(values.requireConfirmation !== baseline.requireConfirmation
      ? { requireConfirmation: values.requireConfirmation }
      : {}),
  };
  return Object.keys(patch).length > 0 ? patch : null;
}

export function noticeTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  const two = (number: number) => String(number).padStart(2, '0');
  return `${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`;
}
export function noticeStatusTone(status: 'draft' | 'scheduled' | 'published' | 'withdrawn') {
  const tones = { draft: 'warning', scheduled: 'info', published: 'success', withdrawn: 'danger' } as const;
  return tones[status];
}
