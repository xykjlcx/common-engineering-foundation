import { defineErrors } from '../../kernel/errors.js';

export const menuErrors = defineErrors({
  'menu.not_found': { status: 404, message: '对象不存在或已不在可访问范围，请刷新核对' },
  'menu.catalog_owned': { status: 403, message: '目录拥有的菜单不能按此方式修改或删除' },
  'menu.has_children': { status: 409, message: '请先处理下级菜单' },
  'menu.parent_not_found': { status: 404, message: '上级菜单不存在' },
  'menu.parent_invalid': { status: 422, message: '所选上级菜单不符合层级规则' },
  'menu.version_conflict': { status: 409, message: '资料已被其他操作更新，请重新载入后核对修改' },
  'menu.field_type_mismatch': { status: 422, message: '字段与菜单类型不匹配' },
});
