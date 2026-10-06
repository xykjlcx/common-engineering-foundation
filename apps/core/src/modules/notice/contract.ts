import * as z from 'zod';

export const NOTICE_STATUSES = ['draft', 'scheduled', 'published', 'withdrawn'] as const;
export const NOTICE_SEVERITIES = ['normal', 'important', 'urgent'] as const;
export const NOTICE_AUDIENCES = ['all', 'departments', 'roles'] as const;
export const NoticeStatusSchema = z.enum(NOTICE_STATUSES);
export const NoticeSeveritySchema = z.enum(NOTICE_SEVERITIES);
export const NoticeAudienceSchema = z.enum(NOTICE_AUDIENCES);

export const NoticeFieldsSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(20000),
    severity: NoticeSeveritySchema,
    audience: NoticeAudienceSchema,
    audienceIds: z.array(z.uuid()).max(500),
    pinned: z.boolean(),
    requireConfirmation: z.boolean(),
  })
  .strict();
export const CreateNoticeSchema = NoticeFieldsSchema.extend({
  severity: NoticeSeveritySchema.default('normal'),
  audience: NoticeAudienceSchema.default('all'),
  audienceIds: z.array(z.uuid()).max(500).default([]),
  pinned: z.boolean().default(false),
  requireConfirmation: z.boolean().default(false),
}).refine(
  (value) => (value.audience === 'all' ? value.audienceIds.length === 0 : value.audienceIds.length > 0),
  { message: '请选择与发布范围一致的目标', path: ['audienceIds'] },
);
export const NoticeVersionSchema = z
  .object({ id: z.uuid(), version: z.number().int().nonnegative() })
  .strict();
export const UpdateNoticeSchema = NoticeFieldsSchema.partial()
  .extend({
    id: z.uuid(),
    version: z.number().int().nonnegative(),
  })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== 'id' && key !== 'version'), {
    message: '至少修改一个字段',
  });
export const ScheduleNoticeSchema = NoticeVersionSchema.extend({ scheduledAt: z.iso.datetime() });
export const NoticeViewSchema = NoticeFieldsSchema.extend({
  id: z.uuid(),
  status: NoticeStatusSchema,
  version: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().nullable(),
  withdrawnAt: z.iso.datetime().nullable(),
  scheduledAt: z.iso.datetime().nullable(),
  publisherName: z.string().nullable(),
  recipientCount: z.number().int().nonnegative(),
  readCount: z.number().int().nonnegative(),
  confirmedCount: z.number().int().nonnegative(),
});
export const NoticeListInputSchema = z
  .object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
    keyword: z.string().trim().max(200).optional(),
    status: NoticeStatusSchema.optional(),
  })
  .strict();
export const NoticeListSchema = z.object({
  list: z.array(NoticeViewSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const AudienceOptionsSchema = z.object({
  departments: z.array(z.object({ id: z.uuid(), name: z.string() })),
  roles: z.array(z.object({ id: z.uuid(), name: z.string() })),
});
export type NoticeView = z.infer<typeof NoticeViewSchema>;
export type CreateNoticeInput = z.input<typeof CreateNoticeSchema>;
export type NoticeAudience = z.infer<typeof NoticeAudienceSchema>;
