import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { runCommand } from '../../../kernel/command.js';
import { noticeErrors } from '../errors.js';
import { NOTICE_PERMS } from '../permissions.js';
import { NoticeVersionSchema, NoticeViewSchema } from '../contract.js';
import { findNotice, assertNoticeState, updateNoticeRow, noticeView } from '../store.js';
import { withdrawAnnouncement } from '../../message/api.js';
const definition = {
  route: { method: 'POST', path: '/notices/{id}/withdraw', summary: '撤回公告' },
  meta: { perm: NOTICE_PERMS.withdraw },
} satisfies SliceDefinition;
const inputSchema = NoticeVersionSchema;
const outputSchema = NoticeViewSchema;
const errors = { ...commonErrorContracts, ...noticeErrors };
export const withdrawNotice = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：notice 为全局公告管理，独立权限允许跨部门广播，不按账号范围裁剪。
    return runCommand(ctx, async (txCtx) => {
      const before = await findNotice(txCtx.db, input.id);
      assertNoticeState(before, input.version, ['published']);
      const row = await updateNoticeRow(txCtx.db, before, ctx.clock.now(), {
        status: 'withdrawn',
        withdrawnAt: ctx.clock.now(),
      });
      await withdrawAnnouncement(txCtx, row.id);
      const result = await noticeView(txCtx.db, row);
      ctx.audit.capture({ objectType: 'notice', objectId: row.id, before, after: result });
      return outputSchema.parse(result);
    });
  });
