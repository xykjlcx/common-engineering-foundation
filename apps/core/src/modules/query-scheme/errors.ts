import { defineErrors } from '../../kernel/errors.js';

export const querySchemeErrors = defineErrors({
  'query_scheme.not_found': { status: 404, message: '方案不存在或不可访问' },
  'query_scheme.name_conflict': { status: 409, message: '方案名称重复' },
  'query_scheme.resource_invalid': { status: 400, message: '未登记的查询方案资源' },
  'query_scheme.version_conflict': { status: 409, message: '方案已被其他操作更新，请重新载入后核对修改' },
  'query_scheme.sharing_forbidden': { status: 403, message: '只有系统管理员可以维护共享方案' },
});
