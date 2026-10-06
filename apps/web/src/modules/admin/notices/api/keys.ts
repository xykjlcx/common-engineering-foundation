import type { NoticeListParams } from './schema';
export const noticeKeys = {
  all: ['iam', 'notices'] as const,
  list: (params: NoticeListParams) => [...noticeKeys.all, 'list', params] as const,
  detail: (id: string) => [...noticeKeys.all, 'detail', id] as const,
  audienceOptions: () => [...noticeKeys.all, 'audience-options'] as const,
};
