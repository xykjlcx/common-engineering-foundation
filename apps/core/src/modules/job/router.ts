import { queryJobList } from './slices/query-job-list.js';
import { queryJobDetail } from './slices/query-job-detail.js';
import { queryJobLogs } from './slices/query-job-logs.js';
import { previewJob } from './slices/preview-job.js';
import { updateJob } from './slices/update-job.js';
import { setJobEnabled } from './slices/set-job-enabled.js';
import { runJobNow } from './slices/run-job.js';
export const jobRouter = {
  list: queryJobList,
  detail: queryJobDetail,
  logs: queryJobLogs,
  preview: previewJob,
  update: updateJob,
  setEnabled: setJobEnabled,
  run: runJobNow,
};
