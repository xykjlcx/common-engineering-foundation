import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { NoticeViewSchema } from '../contract.js';
import { noticeErrors } from '../errors.js';
import { NOTICE_PERMS } from '../permissions.js';
import { findNotice, noticeView } from '../store.js';
const definition = {
  route: { method: 'GET', path: '/notices/{id}', summary: '读取公告详情与阅读率' },
  meta: { perm: NOTICE_PERMS.view },
} satisfies SliceDefinition;
const inputSchema = z.object({ id: z.uuid() }).strict();
const outputSchema = NoticeViewSchema;
const errors = { ...commonErrorContracts, ...noticeErrors };
export const getNoticeDetail = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：notice 为独立权限保护的全局公告配置。
    return noticeView(ctx.db, await findNotice(ctx.db, input.id));
  });
