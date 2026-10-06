import { eq } from 'drizzle-orm';
import type { DbExec } from '../../kernel/context.js';
import { ValidationError } from '../../kernel/errors.js';
import { DEFAULT_RUNTIME_POLICY, type RuntimePolicy } from '../../kernel/policy.js';
import { passwordMeetsPolicy, SettingsViewSchema } from './contract.js';
import { systemSettings } from './schema.js';

export async function readSettings(db: DbExec, policy: RuntimePolicy = DEFAULT_RUNTIME_POLICY) {
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'global')).limit(1);
  return SettingsViewSchema.parse(
    row
      ? {
          values: row.values,
          version: row.version,
          updatedAt: row.updatedAt.toISOString(),
        }
      : {
          values: {
            general: { appName: 'Keel', loginDescription: '使用企业账号登录管理后台' },
            security: { ...policy },
            credentials: {
              minLength: 8,
              requireUppercase: false,
              requireLowercase: false,
              requireNumber: false,
              requireSymbol: false,
            },
            uploads: { avatarMaxMiB: 2 },
          },
          version: 0,
          updatedAt: null,
        },
  );
}

export async function assertPasswordPolicy(db: DbExec, password: string): Promise<void> {
  const { values } = await readSettings(db);
  if (!passwordMeetsPolicy(password, values.credentials)) {
    throw new ValidationError('validation.failed', { field: 'password', requirements: values.credentials });
  }
}
