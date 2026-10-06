import { z } from 'zod';
export const messagesSearchSchema = z.object({
  keyword: z.string().catch(''),
  category: z.enum(['all', 'system', 'announcement', 'archived']).catch('all'),
  unreadOnly: z.boolean().catch(false),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});
export function messageListParams(search: z.infer<typeof messagesSearchSchema>) {
  return {
    keyword: search.keyword || undefined,
    kind: search.category === 'system' || search.category === 'announcement' ? search.category : undefined,
    archived: search.category === 'archived',
    unreadOnly: search.unreadOnly,
    page: search.page,
    pageSize: search.pageSize,
  };
}
export function canArchiveMessage(message: { requireConfirmation: boolean; confirmedAt: string | null }) {
  return !message.requireConfirmation || message.confirmedAt !== null;
}
