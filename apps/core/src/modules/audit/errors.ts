import { defineErrors } from '../../kernel/errors.js';

export const auditErrors = defineErrors({
  'audit.not_found': { status: 404, message: '审计记录不存在' },
  'audit.session.not_found': { status: 404, message: '有效会话不存在，请刷新列表' },
});
