import { and, asc, eq, lte } from 'drizzle-orm';
import { record, type AuditRecord } from '../../../kernel/audit.js';
import type { RequestCtx } from '../../../kernel/context.js';
import { notices } from '../schema.js';
import { noticeView } from '../store.js';
import { publishNoticeInTx } from './publish.js';

type SchedulerEnv = Pick<RequestCtx, 'db' | 'clock' | 'idgen' | 'logger'>;

export async function publishDueNotices(env: SchedulerEnv) {
  const due = await env.db
    .select({ id: notices.id })
    .from(notices)
    .where(and(eq(notices.status, 'scheduled'), lte(notices.scheduledAt, env.clock.now())))
    .orderBy(asc(notices.scheduledAt), asc(notices.id));
  let published = 0;
  for (const candidate of due) {
    try {
      const done = await env.db.transaction(async (db) => {
        const [row] = await db
          .select()
          .from(notices)
          .where(
            and(
              eq(notices.id, candidate.id),
              eq(notices.status, 'scheduled'),
              lte(notices.scheduledAt, env.clock.now()),
            ),
          )
          .for('update');
        if (!row) return null;
        const updated = await publishNoticeInTx({ ...env, db }, row, {
          id: row.publisherId,
          name: row.publisherName ?? '系统公告',
        });
        await noticeView(db, updated);
        return {
          actorUserId: row.publisherId,
          sessionId: null,
          isImpersonation: false,
          action: 'notice.scheduledPublish',
          ip: null,
          traceId: null,
          outcome: 'success',
          errorCode: null,
          withValues: true,
          patch: {
            objectType: 'notice',
            objectId: row.id,
            before: { status: row.status, version: row.version },
            after: { status: updated.status, version: updated.version },
          },
        } satisfies AuditRecord;
      });
      if (done) {
        published += 1;
        await record(env.db, env.clock, env.idgen, done).catch((error: unknown) => {
          env.logger.error(
            { noticeId: candidate.id, error: error instanceof Error ? error.name : 'unknown' },
            'scheduled notice audit failed',
          );
        });
      }
    } catch (error) {
      env.logger.error(
        { noticeId: candidate.id, error: error instanceof Error ? error.name : 'unknown' },
        'scheduled notice publish failed',
      );
    }
  }
  return { published };
}

export function startNoticeScheduler(env: SchedulerEnv) {
  let pending: Promise<unknown> | undefined;
  const tick = () => {
    if (pending) return;
    pending = publishDueNotices(env)
      .catch((error: unknown) => {
        env.logger.error(
          { error: error instanceof Error ? error.name : 'unknown' },
          'notice scheduler scan failed',
        );
      })
      .finally(() => {
        pending = undefined;
      });
  };
  tick();
  const timer = setInterval(tick, 10_000);
  timer.unref();
  return async () => {
    clearInterval(timer);
    await pending;
  };
}
