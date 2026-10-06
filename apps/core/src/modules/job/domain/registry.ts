import type { Clock } from '../../../kernel/clock.js';
import type { DbExec } from '../../../kernel/context.js';
import { BizError } from '../../../kernel/errors.js';
import { cleanupExpiredSessions } from '../../../kernel/session.js';
export type JobHandler = (db: DbExec, clock: Clock) => Promise<string>;
export const registeredJobs = [
  {
    key: 'job.session.cleanup',
    name: '清理过期会话',
    description: '清理超过有效期或绝对有效期的服务端会话，保留有效会话与业务审计。',
    cron: '0 2 * * *',
    handler: async (db: DbExec, clock: Clock) =>
      `已清理 ${String(await cleanupExpiredSessions(db, clock))} 条过期会话`,
  },
];
export function registeredJob(key: string) {
  const definition = registeredJobs.find((item) => item.key === key);
  if (!definition) throw new BizError('job.not_found', { key });
  return definition;
}
