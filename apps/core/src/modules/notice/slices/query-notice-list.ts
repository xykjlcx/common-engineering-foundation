import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { commonErrorContracts } from '../../../kernel/errors.js';
import { NoticeListInputSchema, NoticeListSchema } from '../contract.js';
import { NOTICE_PERMS } from '../permissions.js';
import { notices } from '../schema.js';
import { noticeView } from '../store.js';
const definition = {
  route: { method: 'GET', path: '/notices', summary: '公告列表' },
  meta: { perm: NOTICE_PERMS.view },
} satisfies SliceDefinition;
const inputSchema = NoticeListInputSchema;
const outputSchema = NoticeListSchema;
const errors = commonErrorContracts;
export const queryNoticeList = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    // ③豁免：notice 为独立权限保护的全局公告配置。
    const pattern = input.keyword ? `%${input.keyword.replace(/[\\%_]/g, '\\$&')}%` : undefined;
    const where = and(
      input.status ? eq(notices.status, input.status) : undefined,
      pattern ? or(ilike(notices.title, pattern), ilike(notices.content, pattern)) : undefined,
    );
    const rows = await ctx.db
      .select()
      .from(notices)
      .where(where)
      .orderBy(desc(notices.pinned), desc(notices.createdAt), desc(notices.id))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);
    const [total] = await ctx.db.select({ total: count() }).from(notices).where(where);
    const list = await Promise.all(rows.map((row) => noticeView(ctx.db, row)));
    return { list, total: total?.total ?? 0, page: input.page, pageSize: input.pageSize };
  });
