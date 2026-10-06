import { defineErrors } from '../../kernel/errors.js';

export const fileErrors = defineErrors({
  'file.avatar_invalid': { status: 400, message: '头像文件不符合要求' },
  'file.avatar.not_found': { status: 404, message: '头像文件已失效，请重新上传' },
  'file.storage.invalid_key': { status: 422, message: '文件存储键无效' },
});
