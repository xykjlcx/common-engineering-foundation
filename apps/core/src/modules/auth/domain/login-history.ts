import { and, count, desc, eq, gte, inArray, isNull, lt, max, or, sql, type SQLWrapper } from 'drizzle-orm';
import type { DbExec } from '../../../kernel/context.js';
import { loginEvents } from '../schema.js';

/** 调用方必须已完成用户可见性检查，认证模块只提供事件事实。 */
export async function getLastLogins(db: DbExec, ids: readonly string[]): Promise<Map<string, Date | null>> {
  if (!ids.length) return new Map();
  const rows = await db
    .select({ userId: loginEvents.userId, at: max(loginEvents.occurredAt) })
    .from(loginEvents)
    .where(and(inArray(loginEvents.userId, [...ids]), eq(loginEvents.outcome, 'success')))
    .groupBy(loginEvents.userId);
  return new Map(rows.flatMap((row) => (row.userId ? [[row.userId, row.at]] : [])));
}

/** 调用方先完成目标用户可见性校验；时间相同以唯一 ID 定序。 */
export async function getUserLoginPage(
  db: DbExec,
  target: { id: string; username: string; createdAt: Date },
  query: { page: number; pageSize: number; result?: string; from?: string; to?: string },
) {
  const { page, pageSize } = query;
  // 账号不可改名/复用：未关联主体的失败记录只代表创建后针对该账号的尝试。
  const where = and(
    or(
      eq(loginEvents.userId, target.id),
      and(
        isNull(loginEvents.userId),
        eq(loginEvents.username, target.username),
        gte(loginEvents.occurredAt, target.createdAt),
      ),
    ),
    query.result ? eq(loginEvents.outcome, query.result) : undefined,
    query.from ? gte(loginEvents.occurredAt, new Date(query.from)) : undefined,
    query.to ? lt(loginEvents.occurredAt, new Date(query.to)) : undefined,
  );
  const [list, totals] = await Promise.all([
    db
      .select({
        id: loginEvents.id,
        at: loginEvents.occurredAt,
        ip: loginEvents.ip,
        device: loginEvents.ua,
        result: loginEvents.outcome,
        reason: loginEvents.reason,
      })
      .from(loginEvents)
      .where(where)
      .orderBy(desc(loginEvents.occurredAt), desc(loginEvents.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(loginEvents).where(where),
  ]);
  return { list, total: totals[0]?.total ?? 0, page, pageSize };
}

/** 用户查询只组合此表达式，成功登录事实与表归属仍在 auth。 */
export function latestSuccessfulLoginAt(userId: SQLWrapper) {
  return sql<Date | null>`(select max(${loginEvents.occurredAt}) from ${loginEvents} where ${loginEvents.userId} = ${userId} and ${loginEvents.outcome} = 'success')`;
}

/** 概要事实不从分页/截断后的历史展示窗口推导。 */
export async function getLastSuccessfulLogin(db: DbExec, id: string) {
  const [event] = await db
    .select({ at: loginEvents.occurredAt, ip: loginEvents.ip })
    .from(loginEvents)
    .where(and(eq(loginEvents.userId, id), eq(loginEvents.outcome, 'success')))
    .orderBy(desc(loginEvents.occurredAt), desc(loginEvents.id))
    .limit(1);
  return event ?? null;
}

/** 全站审计查询由调用方的 audit 权限负责，保留事件原始用户名与原因。 */
export async function getGlobalLoginPage(
  db: DbExec,
  input: {
    from: string;
    to: string;
    page: number;
    pageSize: number;
    username?: string;
    outcome?: string;
    ip?: string;
  },
) {
  const keyword = input.username?.replace(/[\\%_]/g, '\\$&');
  const where = and(
    gte(loginEvents.occurredAt, new Date(input.from)),
    lt(loginEvents.occurredAt, new Date(input.to)),
    input.username ? sql`${loginEvents.username} ilike ${`%${keyword}%`} escape '\\'` : undefined,
    input.outcome ? eq(loginEvents.outcome, input.outcome) : undefined,
    input.ip ? eq(loginEvents.ip, input.ip) : undefined,
  );
  const [list, totals] = await Promise.all([
    db
      .select()
      .from(loginEvents)
      .where(where)
      .orderBy(desc(loginEvents.occurredAt), desc(loginEvents.id))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
    db.select({ total: count() }).from(loginEvents).where(where),
  ]);
  return { list, total: totals[0]?.total ?? 0, page: input.page, pageSize: input.pageSize };
}
