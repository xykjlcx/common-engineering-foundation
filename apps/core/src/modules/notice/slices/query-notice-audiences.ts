import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { AudienceOptionsSchema } from '../contract.js';
import { NOTICE_PERMS } from '../permissions.js';
import { audienceOptions } from '../domain/audience.js';
const definition = {
  route: { method: 'GET', path: '/notice-audiences', summary: '公告发布范围选项' },
  meta: { perm: NOTICE_PERMS.view },
} satisfies SliceDefinition;
const inputSchema = z.object({}).strict();
const outputSchema = AudienceOptionsSchema;
const errors = commonErrorContracts;
export const queryNoticeAudiences = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    // ③豁免：公告独立权限允许查看可用组织与角色名称，不返回用户身份明细。
    return audienceOptions(ctx.db);
  });
