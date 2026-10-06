import * as z from 'zod';

export const LoginInputSchema = z
  .object({
    username: z.string().trim().min(1).max(64).toLowerCase(),
    password: z.string().min(1).max(256),
    rememberMe: z.boolean().default(false),
  })
  .strict();

export const ChangePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
  })
  .strict();
