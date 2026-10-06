import { z } from 'zod';

export const GeneralSettingsSchema = z
  .object({
    appName: z.string().trim().min(1).max(64),
    loginDescription: z.string().trim().min(1).max(200),
  })
  .strict();
export const SecuritySettingsSchema = z
  .object({
    lockThreshold: z.number().int().min(1).max(100),
    ipLockThreshold: z.number().int().min(1).max(1000),
    lockWindowMs: z.number().int().min(1000).max(86_400_000),
    sessionTtlMs: z.number().int().min(60_000).max(2_592_000_000),
    sessionRememberTtlMs: z.number().int().min(60_000).max(2_592_000_000),
  })
  .strict();
export const CredentialSettingsSchema = z
  .object({
    minLength: z.number().int().min(8).max(128),
    requireUppercase: z.boolean(),
    requireLowercase: z.boolean(),
    requireNumber: z.boolean(),
    requireSymbol: z.boolean(),
  })
  .strict();
export const UploadSettingsSchema = z.object({ avatarMaxMiB: z.number().int().min(1).max(10) }).strict();
export const SettingsValuesSchema = z
  .object({
    general: GeneralSettingsSchema,
    security: SecuritySettingsSchema,
    credentials: CredentialSettingsSchema,
    uploads: UploadSettingsSchema,
  })
  .strict();
export const SettingsViewSchema = z
  .object({
    values: SettingsValuesSchema,
    version: z.number().int().min(0),
    updatedAt: z.iso.datetime().nullable(),
  })
  .strict();
export const UpdateSettingsSchema = SettingsViewSchema.omit({ updatedAt: true });
export type SettingsValues = z.infer<typeof SettingsValuesSchema>;
export type CredentialSettings = z.infer<typeof CredentialSettingsSchema>;

export function passwordMeetsPolicy(password: string, policy: CredentialSettings): boolean {
  return (
    password.length >= policy.minLength &&
    password.length <= 128 &&
    (!policy.requireUppercase || /[A-Z]/.test(password)) &&
    (!policy.requireLowercase || /[a-z]/.test(password)) &&
    (!policy.requireNumber || /[0-9]/.test(password)) &&
    (!policy.requireSymbol || /[^A-Za-z0-9\s]/.test(password))
  );
}
