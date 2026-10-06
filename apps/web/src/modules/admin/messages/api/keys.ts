import type { MessageListParams } from './schema';
export const messageKeys = {
  all: ['iam', 'messages'] as const,
  list: (params: MessageListParams) => [...messageKeys.all, 'list', params] as const,
  detail: (id: string) => [...messageKeys.all, 'detail', id] as const,
  unread: () => [...messageKeys.all, 'unread'] as const,
  pending: () => [...messageKeys.all, 'pending'] as const,
  preferences: () => [...messageKeys.all, 'preferences'] as const,
};
