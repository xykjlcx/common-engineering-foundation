import { defineErrors } from '../../kernel/errors.js';

export const postErrors = defineErrors({
  'post.disabled': { status: 422, message: '岗位已停用，请重新选择' },
  'post.in_use': { status: 409, message: '岗位被用户引用，不能删除' },
  'post.not_found': { status: 404, message: '岗位不存在' },
  'post.code_conflict': { status: 409, message: '岗位编码已存在' },
  'post.name_conflict': { status: 409, message: '岗位名称已存在' },
  'post.version_conflict': { status: 409, message: '岗位已更新，请重新载入' },
  'post.role_unavailable': { status: 422, message: '角色不存在或已停用，请重新选择' },
});
