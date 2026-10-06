import * as z from 'zod';
import { OperationSchema } from '../audit/contract.js';

export const OverviewInputSchema = z
  .object({
    timeZone: z
      .string()
      .max(100)
      .refine((value) => {
        if (/^[+-]/.test(value)) return false;
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, '无效 IANA 时区')
      .transform((value) => new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone)
      .default('UTC'),
  })
  .strict();
const count = z.number().int().nonnegative();
export const OverviewSchema = z
  .object({
    timeZone: z.string(),
    generatedAt: z.iso.datetime(),
    lastLogin: z
      .object({ at: z.iso.datetime(), ip: z.string().nullable(), ua: z.string().nullable() })
      .nullable(),
    sessions: z.object({ count, users: count }).optional(),
    loginsToday: z.object({ success: count, failure: count }).optional(),
    trend: z
      .array(z.object({ date: z.iso.date(), logins: count, changes: count }))
      .length(14)
      .optional(),
    recentChanges: z.array(OperationSchema).max(5).optional(),
    attention: z
      .object({
        lockedAccounts: count.optional(),
        usersWithoutRole: count.optional(),
        deptsWithoutLeader: count.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
