import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { BizError, commonErrorContracts } from '../../../kernel/errors.js';
import { runCommand } from '../../../kernel/command.js';
import { noticeErrors } from '../errors.js';
import { NOTICE_PERMS } from '../permissions.js';
import { UpdateNoticeSchema, NoticeViewSchema } from '../contract.js';
import { CreateNoticeSchema } from '../contract.js';
import { findNotice, assertNoticeState, updateNoticeRow, noticeView } from '../store.js';
import { assertAudience } from '../domain/audience.js';
const definition = {
  route: { method: 'PATCH', path: '/notices/{id}', summary: '编辑公告草稿' },
  meta: { perm: NOTICE_PERMS.update },
} satisfies SliceDefinition;
const inputSchema = UpdateNoticeSchema;
const outputSchema = NoticeViewSchema;
const errors = { ...commonErrorContracts, ...noticeErrors };
export const updateNotice = sensitiveProc
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
      const parsed = CreateNoticeSchema.safeParse({
        title: before.title,
        content: before.content,
        severity: before.severity,
        audience: before.audience,
        audienceIds: before.audienceIds,
        pinned: before.pinned,
        requireConfirmation: before.requireConfirmation,
        ...Object.fromEntries(
          Object.entries(input).filter(
            ([key, value]) => key !== 'id' && key !== 'version' && value !== undefined,
          ),
        ),
      });
      if (!parsed.success) throw new BizError('notice.invalid_audience');
      const fields = parsed.data;
      await assertAudience(txCtx.db, fields.audience, fields.audienceIds);
      const row = await updateNoticeRow(txCtx.db, before, ctx.clock.now(), fields);
      const result = await noticeView(txCtx.db, row);
      ctx.audit.capture({ objectType: 'notice', objectId: row.id, before, after: result });
      return outputSchema.parse(result);
    });
  });
