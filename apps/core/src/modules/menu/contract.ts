import * as z from 'zod';
export { MenuTypeSchema } from './tree-contract.js';

export const MenuLabelSchema = z
  .record(z.string().min(1), z.string().min(1).max(64))
  .refine((v) => Object.keys(v).length > 0, { error: '至少提供一种语言的标签' });
export const MenuIconSchema = z.string().trim().max(64).nullable();
export const MenuSortSchema = z.number().int();
export const MenuVersionSchema = z.number().int().min(0);

export const CreateMenuSchema = z
  .object({
    type: z.literal('dir'),
    subsystemKey: z.string().trim().min(1).max(64).default('admin'),
    label: MenuLabelSchema,
    icon: MenuIconSchema.default(null),
    visible: z.boolean().default(true),
    sort: MenuSortSchema.default(0),
    parentId: z.null().default(null),
  })
  .strict();

export const MenuCustomizationSchema = z
  .object({
    parentId: z.uuid().nullable().optional(),
    label: MenuLabelSchema.optional(),
    icon: MenuIconSchema.optional(),
    visible: z.boolean().optional(),
    sort: MenuSortSchema.optional(),
  })
  .strict();

const PATCH_FIELDS = ['parentId', 'label', 'icon', 'visible', 'sort'] as const;
export const UpdateMenuSchema = z
  .object({
    id: z.uuid(),
    ...MenuCustomizationSchema.shape,
    version: MenuVersionSchema,
  })
  .strict()
  .refine((v) => PATCH_FIELDS.some((f) => v[f] !== undefined), {
    error: '至少需要一个待更新字段',
  });

export const DeleteMenuSchema = z.object({ id: z.uuid(), version: MenuVersionSchema }).strict();
