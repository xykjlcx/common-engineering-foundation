import { CronExpressionParser } from 'cron-parser';
import { BizError } from '../../../kernel/errors.js';
import { JOB_TIMEZONE } from '../contract.js';
export function nextRuns(cron: string, now: Date): string[] {
  try {
    if (cron.trim().split(/\s+/).length !== 5 || !/^[\d*/\s,-]+$/.test(cron))
      throw new Error('unsupported cron');
    const expression = CronExpressionParser.parse(cron, { currentDate: now, tz: JOB_TIMEZONE });
    return Array.from({ length: 3 }, () => expression.next().toDate().toISOString());
  } catch {
    throw new BizError('job.cron_invalid');
  }
}
