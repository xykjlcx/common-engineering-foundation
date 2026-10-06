import { createNotice } from './slices/create-notice.js';
import { updateNotice } from './slices/update-notice.js';
import { publishNotice } from './slices/publish-notice.js';
import { withdrawNotice } from './slices/withdraw-notice.js';
import { deleteNotice } from './slices/delete-notice.js';
import { getNoticeDetail } from './slices/get-notice-detail.js';
import { queryNoticeList } from './slices/query-notice-list.js';
import { scheduleNotice } from './slices/schedule-notice.js';
import { cancelNoticeSchedule } from './slices/cancel-notice-schedule.js';
import { queryNoticeAudiences } from './slices/query-notice-audiences.js';
export const noticeRouter = {
  list: queryNoticeList,
  detail: getNoticeDetail,
  create: createNotice,
  update: updateNotice,
  publish: publishNotice,
  withdraw: withdrawNotice,
  delete: deleteNotice,
  schedule: scheduleNotice,
  cancelSchedule: cancelNoticeSchedule,
  audienceOptions: queryNoticeAudiences,
};
