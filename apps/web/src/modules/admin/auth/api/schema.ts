import { z } from 'zod';
import {
  LoginInputSchema as CoreLoginInputSchema,
  ChangePasswordInputSchema,
} from '@keel/core/auth-contract';
export { ChangePasswordInputSchema } from '@keel/core/auth-contract';

export const RegisterSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  agree: z.literal(true),
});
export const RegisterResultSchema = z.object({ email: z.string().email() });
export const ForgotPasswordSchema = z.object({ email: z.string().trim().email() });
export const ForgotPasswordResultSchema = z.object({
  email: z.string().email(),
  expiresInMinutes: z.number().int().positive(),
});
// UI 要求显式勾选值；其余输入规则与服务端共用。
export const LoginInputSchema = CoreLoginInputSchema.extend({ rememberMe: z.boolean() });

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;

export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

export const ChangePasswordFormSchema = ChangePasswordInputSchema.extend({
  confirmPassword: z.string().min(1),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'password.mismatch',
});
export type ChangePasswordFormInput = z.infer<typeof ChangePasswordFormSchema>;
