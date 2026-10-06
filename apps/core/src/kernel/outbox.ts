import { and, asc, eq, lte } from 'drizzle-orm';
import { outboxEvents } from '../schema/index.js';
import type { Clock } from './clock.js';
import type { Db, TxExec } from './context.js';

// 事件随业务事务提交或回滚；投递至少一次，消费方须幂等。

export interface OutboxEmit {
  topic: string;
  payload: unknown;
}

export async function emit(tx: TxExec, clock: Clock, idgen: () => string, evt: OutboxEmit): Promise<string> {
  const id = idgen();
  const now = clock.now();
  await tx.insert(outboxEvents).values({
    id,
    topic: evt.topic,
    payload: evt.payload,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
  });
  return id;
}

export interface DrainOptions {
  batchSize?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
}

export interface DrainResult {
  dispatched: number;
  failed: number;
  dead: number;
}

/** occurredAt 使用事件 created_at，不使用可能经过多次重试的投递时间。 */
export type OutboxHandler = (evt: {
  id: string;
  topic: string;
  payload: unknown;
  occurredAt: Date;
}) => Promise<void>;

/** 单 drainer；同毫秒 UUIDv7 不保证 FIFO，严格顺序由消费方按业务字段处理。 */
export async function drainOnce(
  db: Db,
  clock: Clock,
  handler: OutboxHandler,
  opts: DrainOptions = {},
): Promise<DrainResult> {
  const batchSize = opts.batchSize ?? 20;
  const maxAttempts = opts.maxAttempts ?? 8;
  const backoffBaseMs = opts.backoffBaseMs ?? 1_000;
  const now = clock.now();
  const due = await db
    .select()
    .from(outboxEvents)
    .where(and(eq(outboxEvents.status, 'pending'), lte(outboxEvents.nextAttemptAt, now)))
    .orderBy(asc(outboxEvents.createdAt), asc(outboxEvents.id))
    .limit(batchSize);

  const result: DrainResult = { dispatched: 0, failed: 0, dead: 0 };
  for (const row of due) {
    try {
      await handler({ id: row.id, topic: row.topic, payload: row.payload, occurredAt: row.createdAt });
      await db
        .update(outboxEvents)
        .set({ status: 'dispatched', dispatchedAt: clock.now() })
        .where(eq(outboxEvents.id, row.id));
      result.dispatched += 1;
    } catch (e) {
      const attempts = row.attempts + 1;
      const message = e instanceof Error ? e.message : String(e);
      if (attempts >= maxAttempts) {
        await db
          .update(outboxEvents)
          .set({ status: 'dead', attempts, lastError: message })
          .where(eq(outboxEvents.id, row.id));
        result.dead += 1;
      } else {
        const delay = backoffBaseMs * 2 ** row.attempts;
        await db
          .update(outboxEvents)
          .set({ attempts, lastError: message, nextAttemptAt: new Date(clock.now().getTime() + delay) })
          .where(eq(outboxEvents.id, row.id));
        result.failed += 1;
      }
    }
  }
  return result;
}
