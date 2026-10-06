import { defineErrors } from '../../kernel/errors.js';
export const noticeErrors = defineErrors({
  'notice.not_found': { status: 404, message: '公告不存在' },
  'notice.version_conflict': { status: 409, message: '公告已更新，请刷新后重试' },
  'notice.invalid_state': { status: 409, message: '当前公告状态不允许此操作' },
  'notice.invalid_audience': { status: 422, message: '发布范围不存在或已停用，请重新选择' },
  'notice.invalid_schedule': { status: 422, message: '发布时间必须晚于当前时间' },
});
