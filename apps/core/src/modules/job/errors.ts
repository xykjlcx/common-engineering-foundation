import { defineErrors } from '../../kernel/errors.js';
export const jobErrors = defineErrors({
  'job.not_found': { status: 404, message: '任务不存在' },
  'job.version_conflict': { status: 409, message: '任务配置已变化，请刷新后重试' },
  'job.busy': { status: 409, message: '任务正在执行，请稍后重试' },
  'job.cron_invalid': { status: 422, message: 'Cron 表达式无效或没有可执行日期' },
});
