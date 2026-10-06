import * as z from 'zod';

export const MessageKindSchema = z.enum(['system', 'announcement']);
export const MessageSeveritySchema = z.enum(['normal', 'important', 'urgent']);
export const MessageViewSchema = z.object({
  id: z.uuid(),
  noticeId: z.uuid().nullable(),
  kind: MessageKindSchema,
  title: z.string(),
  content: z.string(),
  senderName: z.string(),
  severity: MessageSeveritySchema,
  pinned: z.boolean(),
  requireConfirmation: z.boolean(),
  confirmedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  readAt: z.iso.datetime().nullable(),
  archivedAt: z.iso.datetime().nullable(),
});
export type MessageView = z.infer<typeof MessageViewSchema>;
const QueryBooleanSchema = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true'),
]);
export const MessageListInputSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    keyword: z.string().trim().max(200).optional(),
    kind: MessageKindSchema.optional(),
    archived: QueryBooleanSchema.default(false),
    unreadOnly: QueryBooleanSchema.default(false),
  })
  .strict();
export const MessagePageSchema = z.object({
  list: z.array(MessageViewSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export const MessagePreferencesSchema = z.object({ badgeEnabled: z.boolean() }).strict();
export const MessageUnreadSchema = z.object({
  count: z.number().int().nonnegative(),
  system: z.number().int().nonnegative(),
  announcement: z.number().int().nonnegative(),
  badgeEnabled: z.boolean(),
});
