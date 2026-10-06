import { defineErrors } from '../../kernel/errors.js';

export const messageErrors = defineErrors({
  'message.not_found': { status: 404, message: '消息不存在或已撤回' },
  'message.confirmation_required': { status: 409, message: '请先确认公告再归档' },
  'message.confirmation_not_required': { status: 409, message: '该消息不需要确认' },
});
