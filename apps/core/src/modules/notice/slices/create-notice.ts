import { sensitiveProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { runCommand } from '../../../kernel/command.js';
import { noticeErrors } from '../errors.js';
import { NOTICE_PERMS } from '../permissions.js';
import { CreateNoticeSchema, NoticeViewSchema } from '../contract.js';
import { notices } from '../schema.js';
import { noticeView } from '../store.js';
import { assertAudience } from '../domain/audience.js';
const definition = {
  route: { method: 'POST', path: '/notices', summary: '新建公告草稿' },
  meta: { perm: NOTICE_PERMS.create },
} satisfies SliceDefinition;
const inputSchema = CreateNoticeSchema;
const outputSchema = NoticeViewSchema;
const errors = { ...commonErrorContracts, ...noticeErrors };
export const createNotice = sensitiveProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：notice 为全局公告管理，独立权限允许跨部门广播，不按账号范围裁剪。
    return runCommand(ctx, async (txCtx) => {
      await assertAudience(txCtx.db, input.audience, input.audienceIds);
      const now = ctx.clock.now();
      const [row] = await txCtx.db
        .insert(notices)
        .values({
          ...input,
          audienceIds: [...new Set(input.audienceIds)],
          id: ctx.idgen(),
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      if (!row) throw new Error('notice insert failed');
      const result = await noticeView(txCtx.db, row);
      ctx.audit.capture({ objectType: 'notice', objectId: row.id, before: null, after: result });
      return outputSchema.parse(result);
    });
  });
