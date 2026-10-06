import { z } from 'zod';
import { publicProc } from '../../../kernel/procedures.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { GeneralSettingsSchema } from '../contract.js';
import { readSettings } from '../store.js';

const definition = {
  route: { method: 'GET', path: '/settings/public', summary: '登录页系统名称与说明' },
  meta: { perm: 'none', permNoneReason: '登录前展示系统名称与说明；严格投影，不暴露运行策略' },
} satisfies SliceDefinition;
const inputSchema = z.object({}).strict();
const outputSchema = GeneralSettingsSchema;
const errors = { ...commonErrorContracts };
export const publicSettings = publicProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => (await readSettings(ctx.db, ctx.policy)).values.general);
