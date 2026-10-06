import * as z from 'zod';
import { and, eq } from 'drizzle-orm';
import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BizError, commonErrorContracts } from '../../../kernel/errors.js';
import { runCommand } from '../../../kernel/command.js';
import { NoticeVersionSchema } from '../contract.js';
import { noticeErrors } from '../errors.js';
import { NOTICE_PERMS } from '../permissions.js';
import { notices } from '../schema.js';
import { findNotice, assertNoticeState } from '../store.js';

const definition = {
  route: { method: 'DELETE', path: '/notices/{id}', summary: '删除草稿或已撤回公告' },
  meta: { perm: NOTICE_PERMS.delete },
} satisfies SliceDefinition;
const inputSchema = NoticeVersionSchema;
const outputSchema = z.object({ id: z.uuid() });
const errors = { ...commonErrorContracts, ...noticeErrors };
export const deleteNotice = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：notice 为独立权限保护的全局公告配置。
    return runCommand(ctx, async (txCtx) => {
      const before = await findNotice(txCtx.db, input.id);
      assertNoticeState(before, input.version, ['draft', 'withdrawn']);
      const [row] = await txCtx.db
        .delete(notices)
        .where(and(eq(notices.id, input.id), eq(notices.version, input.version)))
        .returning({ id: notices.id });
      if (!row) throw new BizError('notice.version_conflict');
      ctx.audit.capture({ objectType: 'notice', objectId: row.id, before, after: null });
      return outputSchema.parse(row);
    });
  });
