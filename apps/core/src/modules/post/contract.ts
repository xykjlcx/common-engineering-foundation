import { jsonSchema } from './filter-contract.js';
import * as z from 'zod';

const fields = z.object({
  name: z.string().trim().min(1).max(128),
  sort: z.number().int().min(0).max(999999),
  enabled: z.boolean(),
  remark: z.string().trim().max(500),
  roleIds: z.array(z.uuid()).max(50),
});

export const CreatePostSchema = fields
  .extend({
    code: z
      .string()
      .trim()
      .regex(/^[A-Z][A-Z0-9_-]{1,31}$/),
    sort: fields.shape.sort.default(0),
    enabled: fields.shape.enabled.default(true),
    remark: fields.shape.remark.default(''),
    roleIds: fields.shape.roleIds.default([]),
  })
  .strict();

export const VersionedPostSchema = z.object({ id: z.uuid(), version: z.number().int().min(0) }).strict();

export const UpdatePostSchema = fields
  .partial()
  .extend(VersionedPostSchema.shape)
  .strict()
  .refine((v) => Object.keys(v).length > 2, { error: '至少修改一个字段' });

export const PostRoleSchema = z.object({ id: z.uuid(), name: z.string(), enabled: z.boolean() });

export const PostViewSchema = CreatePostSchema.extend({
  id: z.uuid(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  roles: z.array(PostRoleSchema),
});

export const PostsQuerySchema = z
  .object({
    keyword: z.string().trim().max(128).optional(),
    filters: jsonSchema.optional(),
    enabled: z.boolean().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(15),
  })
  .strict();

export const PostPageSchema = z.object({
  list: z.array(PostViewSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export { rootSchema as PostFilterRootSchema, resolve as resolvePostFilters } from './filter-contract.js';
