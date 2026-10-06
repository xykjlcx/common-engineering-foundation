import { z } from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { SettingsViewSchema } from '../contract.js';
import { SETTINGS_PERMS } from '../permissions.js';
import { readSettings } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/settings', summary: '读取全局系统设置' },
  meta: { perm: SETTINGS_PERMS.view },
} satisfies SliceDefinition;
const inputSchema = z.object({}).strict();
const outputSchema = SettingsViewSchema;
const errors = { ...commonErrorContracts };
export const querySettings = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(({ context: ctx }) => readSettings(ctx.db, ctx.env.policy));
