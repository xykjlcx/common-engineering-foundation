import { defineErrors } from '../../kernel/errors.js';

export const authErrors = defineErrors({
  'auth.credentials_invalid': { status: 401, message: '用户名或密码不正确' },
  'auth.password_change_required': { status: 403, message: '需要先修改密码' },
  'auth.rate_limited': { status: 429, message: '尝试过于频繁，请稍后再试' },
  'auth.user_disabled': { status: 403, message: '账号已停用' },
  'auth.user_not_effective': { status: 403, message: '账号尚未生效' },
  'auth.password_unchanged': { status: 422, message: '新密码不能与当前密码相同' },
  'auth.current_password_invalid': { status: 422, message: '当前密码不正确' },
  'auth.session.not_found': { status: 404, message: '会话不存在或已失效' },
});
