import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type * as z from 'zod';
import type { Ctx, DbExec, TxCtx } from '../../kernel/context.js';
import { BizError } from '../../kernel/errors.js';
import type { MessageListInputSchema } from './contract.js';
import { messages, messagePreferences } from './schema.js';

type InboxCtx = Pick<Ctx, 'db' | 'userId' | 'clock'>;
type DeliveryCtx = Pick<TxCtx, 'db' | 'clock' | 'idgen'>;

export function messageScopeSql(ctx: Pick<Ctx, 'userId'>) {
  return and(eq(messages.recipientId, ctx.userId), isNull(messages.withdrawnAt));
}

export function visibleMessages(
  ctx: Pick<Ctx, 'db' | 'userId'>,
  input: z.infer<typeof MessageListInputSchema>,
) {
  const pattern = input.keyword ? `%${input.keyword.replace(/[\\%_]/g, '\\$&')}%` : undefined;
  const where = and(
    messageScopeSql(ctx),
    input.archived ? isNotNull(messages.archivedAt) : isNull(messages.archivedAt),
    input.kind ? eq(messages.kind, input.kind) : undefined,
    input.unreadOnly ? isNull(messages.readAt) : undefined,
    pattern ? or(ilike(messages.title, pattern), ilike(messages.content, pattern)) : undefined,
  );
  return {
    where,
    query: ctx.db
      .select()
      .from(messages)
      .where(where)
      .orderBy(desc(messages.pinned), desc(messages.createdAt), desc(messages.id))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
  };
}

export async function messagePage(
  ctx: Pick<Ctx, 'db' | 'userId'>,
  input: z.infer<typeof MessageListInputSchema>,
) {
  const { where, query } = visibleMessages(ctx, input);
  const [list, totals] = await Promise.all([
    query,
    ctx.db.select({ total: count() }).from(messages).where(where),
  ]);
  return { list, total: totals[0]?.total ?? 0 };
}

export async function ownMessage(ctx: Pick<Ctx, 'db' | 'userId'>, id: string) {
  const [row] = await ctx.db
    .select()
    .from(messages)
    .where(and(messageScopeSql(ctx), eq(messages.id, id)))
    .limit(1);
  if (!row) throw new BizError('message.not_found');
  return row;
}

export async function readMessage(ctx: InboxCtx, id: string, read: boolean) {
  const now = ctx.clock.now();
  const [row] = await ctx.db
    .update(messages)
    .set({
      readAt: read ? now : null,
      ...(read ? { firstReadAt: sql`coalesce(${messages.firstReadAt}, ${now})` } : {}),
    })
    .where(and(messageScopeSql(ctx), eq(messages.id, id)))
    .returning();
  if (!row) throw new BizError('message.not_found');
  return row;
}

export async function archiveMessage(ctx: InboxCtx, id: string, archived: boolean) {
  const [row] = await ctx.db
    .update(messages)
    .set({ archivedAt: archived ? ctx.clock.now() : null })
    .where(
      and(
        messageScopeSql(ctx),
        eq(messages.id, id),
        archived ? or(eq(messages.requireConfirmation, false), isNotNull(messages.confirmedAt)) : undefined,
      ),
    )
    .returning();
  if (!row) {
    await ownMessage(ctx, id);
    throw new BizError('message.confirmation_required');
  }
  return row;
}

export async function confirmMessage(ctx: InboxCtx, id: string) {
  const now = ctx.clock.now();
  const [row] = await ctx.db
    .update(messages)
    .set({
      confirmedAt: sql`coalesce(${messages.confirmedAt}, ${now})`,
      firstReadAt: sql`coalesce(${messages.firstReadAt}, ${now})`,
      readAt: sql`coalesce(${messages.readAt}, ${now})`,
    })
    .where(and(messageScopeSql(ctx), eq(messages.id, id), eq(messages.requireConfirmation, true)))
    .returning();
  if (!row) {
    await ownMessage(ctx, id);
    throw new BizError('message.confirmation_not_required');
  }
  return row;
}

export async function readAllMessages(ctx: InboxCtx) {
  const now = ctx.clock.now();
  const rows = await ctx.db
    .update(messages)
    .set({ readAt: now, firstReadAt: sql`coalesce(${messages.firstReadAt}, ${now})` })
    .where(and(messageScopeSql(ctx), isNull(messages.archivedAt), isNull(messages.readAt)))
    .returning({ id: messages.id });
  return { count: rows.length };
}

export function pendingMessages(ctx: Pick<Ctx, 'db' | 'userId'>) {
  return ctx.db
    .select()
    .from(messages)
    .where(and(messageScopeSql(ctx), eq(messages.requireConfirmation, true), isNull(messages.confirmedAt)))
    .orderBy(desc(messages.pinned), desc(messages.createdAt), desc(messages.id))
    .limit(20);
}

export async function ownPreferences(ctx: Pick<Ctx, 'db' | 'userId'>) {
  const [row] = await ctx.db
    .select({ badgeEnabled: messagePreferences.badgeEnabled })
    .from(messagePreferences)
    .where(eq(messagePreferences.userId, ctx.userId));
  return row ?? { badgeEnabled: true };
}

export async function saveOwnPreferences(ctx: Pick<Ctx, 'db' | 'userId'>, badgeEnabled: boolean) {
  await ctx.db
    .insert(messagePreferences)
    .values({ userId: ctx.userId, badgeEnabled })
    .onConflictDoUpdate({ target: messagePreferences.userId, set: { badgeEnabled } });
  return { badgeEnabled };
}

export async function unreadMessages(ctx: Pick<Ctx, 'db' | 'userId'>) {
  const [rows, preferences] = await Promise.all([
    ctx.db
      .select({ kind: messages.kind, count: count() })
      .from(messages)
      .where(and(messageScopeSql(ctx), isNull(messages.archivedAt), isNull(messages.readAt)))
      .groupBy(messages.kind),
    ownPreferences(ctx),
  ]);
  const system = rows.find((row) => row.kind === 'system')?.count ?? 0;
  const announcement = rows.find((row) => row.kind === 'announcement')?.count ?? 0;
  return { count: system + announcement, system, announcement, ...preferences };
}

export interface AnnouncementDelivery {
  noticeId: string;
  recipientIds: readonly string[];
  title: string;
  content: string;
  senderName: string;
  severity: 'normal' | 'important' | 'urgent';
  pinned: boolean;
  requireConfirmation: boolean;
}

// 已授权的公告发布能力给定目标快照，投递必须与发布共享事务。
export async function deliverAnnouncement(ctx: DeliveryCtx, input: AnnouncementDelivery): Promise<void> {
  const { recipientIds, ...snapshot } = input;
  const createdAt = ctx.clock.now();
  for (let offset = 0; offset < recipientIds.length; offset += 500) {
    await ctx.db.insert(messages).values(
      recipientIds.slice(offset, offset + 500).map((recipientId) => ({
        ...snapshot,
        recipientId,
        id: ctx.idgen(),
        kind: 'announcement' as const,
        createdAt,
      })),
    );
  }
}

// 公告管理撤回隐藏全部收件记录，阅读与确认事实保留。
export async function withdrawAnnouncement(
  ctx: Pick<TxCtx, 'db' | 'clock'>,
  noticeId: string,
): Promise<void> {
  await ctx.db.update(messages).set({ withdrawnAt: ctx.clock.now() }).where(eq(messages.noticeId, noticeId));
}

// 管理入口只获取聚合人数，不披露收件人身份。
export async function announcementStats(db: DbExec, noticeId: string) {
  const [row] = await db
    .select({
      recipientCount: count(),
      readCount: count(messages.firstReadAt),
      confirmedCount: count(messages.confirmedAt),
    })
    .from(messages)
    .where(eq(messages.noticeId, noticeId));
  return row ?? { recipientCount: 0, readCount: 0, confirmedCount: 0 };
}

// 系统来源在完成自身业务的同一事务中通知真实目标。
export async function deliverSystemMessage(
  ctx: DeliveryCtx,
  input: { recipientId: string; title: string; content: string },
) {
  await ctx.db
    .insert(messages)
    .values({ ...input, id: ctx.idgen(), kind: 'system', senderName: '系统', createdAt: ctx.clock.now() });
}
