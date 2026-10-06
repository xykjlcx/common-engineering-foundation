import { defineErrors } from '../../kernel/errors.js';

export const deptErrors = defineErrors({
  'dept.not_found': { status: 404, message: '对象不存在或已不在可访问范围，请刷新核对' },
  'dept.code_conflict': { status: 409, message: '部门编码已存在' },
  'dept.in_use': { status: 409, message: '部门仍有下级、成员或历史引用，不能删除' },
  'dept.leader_not_found': { status: 404, message: '部门负责人不可用，请重新选择' },
  'dept.version_conflict': { status: 409, message: '资料已被其他操作更新，请重新载入后核对修改' },
  'dept.disabled': { status: 422, message: '所选部门已停用，请重新选择' },
  'dept.parent_cycle': { status: 422, message: '上级部门不能是自身或下级部门' },
  'dept.invalid_hierarchy': { status: 422, message: '总公司必须为公司，公司不能挂在部门下面' },
  'dept.root_exists': { status: 422, message: '已存在总公司，请选择上级公司' },
  'dept.impact_changed': { status: 409, message: '组织或成员归属发生变化，请重新预览并确认影响' },
});
