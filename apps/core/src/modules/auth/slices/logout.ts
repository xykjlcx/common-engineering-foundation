import * as z from 'zod';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import { revoke, SESSION_COOKIE } from '../../../kernel/session.js';
import type { SliceDefinition } from '../../../kernel/slice.js';

const definition = {
  route: { method: 'POST', path: '/auth/logout', summary: '登出（吊销当前会话并清 Cookie）' },
  meta: { perm: 'none', permNoneReason: '吊销自身会话无需权限点：目标恒为 ctx.sessionId，无跨主体面' },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.object({ ok: z.literal(true) });

const errors = { ...commonErrorContracts };

export const logout = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    // 吊销目标恒为当前会话；单行更新的原子性由语句保证。
    if (ctx.sessionId !== null) await revoke(ctx.db, ctx.clock, ctx.sessionId);

    // revoke 命中 0 行（会话在本请求进行中被并发吊销）时照样清 Cookie 并返回成功——

    // 登出的语义终态是"这台设备上没有可用会话"，不是"刚好吊销了一行"
    ctx.cookies.clear(SESSION_COOKIE);
    return { ok: true as const };
  });
