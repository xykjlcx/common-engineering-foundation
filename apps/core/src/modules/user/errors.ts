import { defineErrors } from '../../kernel/errors.js';

export const userErrors = defineErrors({
  'user.not_found': { status: 404, message: '对象不存在或已不在可访问范围，请刷新核对' },
  'user.username_conflict': { status: 409, message: '登录账号已存在，请使用其他账号' },
  'user.email_conflict': { status: 409, message: '邮箱已被其他账号使用' },
  'user.employee_no_conflict': { status: 409, message: '工号已被其他用户使用' },
  'user.manager_not_found': { status: 404, message: '直属上级不可用，请重新选择' },
  'user.manager_self_forbidden': { status: 422, message: '不能将自己设为直属上级' },
  'user.version_conflict': { status: 409, message: '资料已被其他操作更新，请重新载入后核对修改' },
  'user.role_grant_conflict': { status: 409, message: '角色授权已变化，请刷新后重新核对' },
  'user.system_admin_protected': { status: 403, message: '系统管理员账号受保护，不能执行此操作' },
  'user.status_left_immutable': { status: 409, message: '离职用户须先办理重新入职' },
  'user.status_self_forbidden': { status: 422, message: '不能对当前登录账号执行此操作' },
  'user.rehire_required': { status: 409, message: '请通过重新入职流程恢复人员状态' },
  'user.employment_transition_invalid': { status: 409, message: '人员状态流转不合法' },
  'user.import_invalid': { status: 400, message: '导入行校验失败' },
  'user.export_limit_exceeded': { status: 400, message: '导出数量超过上限' },
  'user.too_many_roles': { status: 422, message: '角色数量超过上限，请减少后再提交' },
});
