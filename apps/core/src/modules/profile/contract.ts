import * as z from 'zod';
import { UserProfileSchema, UserViewSchema } from '../user/contract.js';

export const ProfileViewSchema = UserViewSchema.extend({
  deptName: z.string().nullable(),
  managerName: z.string().nullable(),
  roleNames: z.array(z.string()),
});
export const UpdateOwnProfileSchema = UserProfileSchema.pick({
  name: true,
  phone: true,
  workLocation: true,
  remark: true,
})
  .partial()
  .extend({ version: z.number().int().min(0) })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== 'version'), {
    message: '至少需要一个待更新字段',
  });
export const ManagedSessionSchema = z
  .object({
    handle: z.uuid(),
    current: z.boolean(),
    ip: z.string().nullable(),
    ua: z.string().nullable(),
    createdAt: z.iso.datetime(),
    lastActiveAt: z.iso.datetime().describe('会话签发或最近续期时间，不逐请求更新'),
    expiresAt: z.iso.datetime(),
  })
  .strict();
export const SessionListSchema = z.object({ sessions: z.array(ManagedSessionSchema) }).strict();
