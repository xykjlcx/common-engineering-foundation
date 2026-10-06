import { defineErrors } from '../../kernel/errors.js';

export const roleErrors = defineErrors({
  'role.not_found': { status: 404, message: '对象不存在或已不在可访问范围，请刷新核对' },
  'role.in_use': { status: 409, message: '角色仍被用户使用，请先移除授权' },
  'role.name_conflict': { status: 409, message: '角色名称已存在' },
  'role.menu_assignment_conflict': { status: 409, message: '角色菜单授权已变化，请刷新后重新核对' },
  'role.system_protected': { status: 403, message: '内置角色受保护，不能执行此操作' },
  'role.version_conflict': { status: 409, message: '资料已被其他操作更新，请重新载入后核对修改' },
  'role.dept_scope_invalid': { status: 422, message: '指定部门与所选数据范围不一致' },
});
