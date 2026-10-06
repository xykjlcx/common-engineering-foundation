import * as z from 'zod';

export const DICT_TONES = ['neutral', 'info', 'success', 'warning', 'danger'] as const;

export const CreateDictTypeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{1,47}$/),
    name: z.string().trim().min(1).max(128),
    remark: z.string().trim().max(500).default(''),
    enabled: z.boolean().default(true),
  })
  .strict();

export const VersionedDictSchema = z.object({ id: z.uuid(), version: z.number().int().min(0) }).strict();

export const UpdateDictTypeSchema = CreateDictTypeSchema.omit({ code: true })
  .extend({ remark: z.string().trim().max(500), enabled: z.boolean() })
  .partial()
  .extend(VersionedDictSchema.shape)
  .strict()
  .refine((v) => Object.keys(v).length > 2, { error: '至少修改一个字段' });

export const CreateDictItemSchema = z
  .object({
    typeId: z.uuid(),
    value: z.string().trim().min(1).max(128),
    label: z.string().trim().min(1).max(128),
    tone: z.enum(DICT_TONES).default('neutral'),
    sort: z.number().int().min(0).max(999999).default(0),
    isDefault: z.boolean().default(false),
    enabled: z.boolean().default(true),
    remark: z.string().trim().max(500).default(''),
  })
  .strict();

export const UpdateDictItemSchema = CreateDictItemSchema.omit({ typeId: true, value: true })
  .extend({
    tone: z.enum(DICT_TONES),
    sort: z.number().int().min(0).max(999999),
    isDefault: z.boolean(),
    enabled: z.boolean(),
    remark: z.string().trim().max(500),
  })
  .partial()
  .extend(VersionedDictSchema.shape)
  .strict()
  .refine((v) => Object.keys(v).length > 2, { error: '至少修改一个字段' });

const record = {
  id: z.uuid(),
  builtin: z.boolean(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};

export const DictTypeViewSchema = CreateDictTypeSchema.extend(record);
export const DictItemViewSchema = CreateDictItemSchema.extend(record);

export const DictItemPageSchema = z.object({
  list: z.array(DictItemViewSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const DictItemsQuerySchema = z
  .object({
    typeId: z.uuid(),
    keyword: z.string().trim().max(128).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(15),
  })
  .strict();
