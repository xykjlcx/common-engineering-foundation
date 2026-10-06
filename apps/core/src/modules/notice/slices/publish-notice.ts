import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BizError, commonErrorContracts } from '../../../kernel/errors.js';
import { runCommand } from '../../../kernel/command.js';
import { noticeErrors } from '../errors.js';
import { NOTICE_PERMS } from '../permissions.js';
import { NoticeVersionSchema, NoticeViewSchema } from '../contract.js';
import { findNotice, assertNoticeState, noticeView } from '../store.js';
import { publishNoticeInTx } from '../domain/publish.js';
import { getAuthUserById } from '../../user/api.js';
const definition = {
  route: { method: 'POST', path: '/notices/{id}/publish', summary: '立即发布公告' },
  meta: { perm: NOTICE_PERMS.publish },
} satisfies SliceDefinition;
const inputSchema = NoticeVersionSchema;
const outputSchema = NoticeViewSchema;
const errors = { ...commonErrorContracts, ...noticeErrors };
export const publishNotice = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：notice 为全局公告管理，独立权限允许跨部门广播，不按账号范围裁剪。
    return runCommand(ctx, async (txCtx) => {
      const before = await findNotice(txCtx.db, input.id);
      assertNoticeState(before, input.version, ['draft']);
      const actor = await getAuthUserById(txCtx.db, ctx.userId);
      if (!actor) throw new BizError('notice.not_found');
      const row = await publishNoticeInTx(txCtx, before, { id: actor.id, name: actor.name });
      const result = await noticeView(txCtx.db, row);
      ctx.audit.capture({ objectType: 'notice', objectId: row.id, before, after: result });
      return outputSchema.parse(result);
    });
  });
