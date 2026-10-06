import { defineErrors } from '../../kernel/errors.js';

export const dictErrors = defineErrors({
  'dict.not_found': { status: 404, message: '字典类型或字典项不存在' },
  'dict.version_conflict': { status: 409, message: '数据已更新，请刷新后重试' },
  'dict.code_conflict': { status: 409, message: '字典编码已存在' },
  'dict.value_conflict': { status: 409, message: '该类型下的值已存在' },
  'dict.type_not_empty': { status: 409, message: '请先删除类型下的字典项' },
  'dict.builtin_protected': { status: 409, message: '内置字典不可删除或修改受保护字段' },
});
