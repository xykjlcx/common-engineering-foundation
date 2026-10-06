import { defineErrors } from '../../kernel/errors.js';
export const settingsErrors = defineErrors({
  'settings.version_conflict': { status: 409, message: '系统设置已被其他管理员更新，请重新载入后再保存' },
});
