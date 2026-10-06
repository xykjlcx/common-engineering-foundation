import { and, eq, sql } from 'drizzle-orm';
import { runCommand } from '../../../kernel/command.js';
import { sensitiveProc } from '../../../kernel/procedures.js';
import { BizError, commonErrorContracts } from '../../../kernel/errors.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { SettingsViewSchema, UpdateSettingsSchema } from '../contract.js';
import { SETTINGS_PERMS } from '../permissions.js';
import { systemSettings } from '../schema.js';
import { readSettings } from '../store.js';
import { settingsErrors } from '../errors.js';

const definition = {
  route: { method: 'PUT', path: '/settings', summary: '保存全局系统设置' },
  meta: { perm: SETTINGS_PERMS.update },
} satisfies SliceDefinition;
const inputSchema = UpdateSettingsSchema;
const outputSchema = SettingsViewSchema;
const errors = { ...commonErrorContracts, ...settingsErrors };
export const updateSettings = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(({ context: ctx, input }) =>
    runCommand(ctx, async (tx) => {
      const before = await readSettings(tx.db, ctx.env.policy);
      if (before.version !== input.version) throw new BizError('settings.version_conflict');
      const now = ctx.clock.now();
      const [row] = await tx.db
        .insert(systemSettings)
        .values({ key: 'global', values: input.values, version: 1, updatedAt: now })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { values: input.values, version: sql`${systemSettings.version} + 1`, updatedAt: now },
          where: and(eq(systemSettings.key, 'global'), eq(systemSettings.version, input.version)),
        })
        .returning();
      if (!row) throw new BizError('settings.version_conflict');
      const after = outputSchema.parse({
        values: row.values,
        version: row.version,
        updatedAt: row.updatedAt.toISOString(),
      });
      tx.audit.capture({ objectType: 'settings', objectId: 'global', before, after });
      return after;
    }),
  );
