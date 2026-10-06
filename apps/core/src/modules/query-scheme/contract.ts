import * as z from 'zod';

export const SchemeResourceSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
export const SchemeFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(64),
    filters: z.string().max(8192),
    scope: z.enum(['mine', 'shared']).default('mine'),
  })
  .strict();
export const SchemeChangesSchema = SchemeFieldsSchema.pick({ name: true, filters: true })
  .partial()
  .refine((input) => input.name !== undefined || input.filters !== undefined);
export const QuerySchemeSchema = z.object({
  id: z.uuid(),
  resource: SchemeResourceSchema,
  name: z.string(),
  filters: z.string(),
  scope: z.enum(['mine', 'shared']),
  editable: z.boolean(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
/** 与 user.list / role.list 同形态；方案总量很小，当前一次返回全部（page 恒为 1）。 */
export const QuerySchemePageSchema = z.object({
  list: z.array(QuerySchemeSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const CreateSchemeSchema = SchemeFieldsSchema.extend({ resource: SchemeResourceSchema });
export const UpdateSchemeSchema = SchemeChangesSchema.safeExtend({
  resource: SchemeResourceSchema,
  id: z.uuid(),
  version: z.number().int().min(0),
});
