import * as z from 'zod';
import { pingDb } from '../../../kernel/db.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { publicProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';

const definition = {
  route: { method: 'GET', path: '/system/health', summary: '存活与数据库连通性' },
  meta: { perm: 'none', permNoneReason: '健康检查探活，无主体语义（ADR-010：GET 也必须显式声明）' },
} satisfies SliceDefinition;

const inputSchema = z.object({});

const outputSchema = z.object({ ok: z.boolean(), now: z.string() });

const errors = { ...commonErrorContracts };

export const health = publicProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    await pingDb(ctx.db);
    return { ok: true, now: ctx.clock.now().toISOString() };
  });
