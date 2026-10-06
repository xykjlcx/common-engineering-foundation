import { BizError } from '../../../kernel/errors.js';
import type { MenuType } from '../schema.js';

/**
 * 父节点不存在。刻意与 `menu.not_found`（目标节点不存在）分码：同为 404，
 * 但前端要提示的对象不同（「你选的上级没了」vs「你要改的节点没了」），
 * 合并成一个码会让文案只能写成含糊的「菜单不存在」。
 * 码尾不是 `.not_found`，必须在 menuErrors 显式声明 status。
 */

/**
 * 层级规则：dir 只能是顶层；menu 挂在 dir 下或顶层；action 必须挂在 menu 下。
 *
 * 这条规则同时是**树深度上限 3** 的唯一来源（dir → menu → action），
 * 也是「树里不可能出现环」的依据（父只能是更高一层的类型，指回自己或后代都不合法）——
 * 树组装函数 `buildMenuTree` 不做环检测，靠的就是这里。放宽本规则前先读那边的注释。
 */
export function assertMenuHierarchy(type: MenuType, parent: { type: MenuType } | null): void {
  const valid =
    type === 'dir'
      ? parent === null
      : type === 'menu'
        ? parent === null || parent.type === 'dir'
        : parent !== null && parent.type === 'menu';
  if (!valid) {
    throw new BizError('menu.parent_invalid', { type, parentType: parent?.type ?? null });
  }
}

/**
 * 字段-类型匹配：dir 无 path/permCode；menu 必须有 path；action 必须有 permCode 且无 path。
 *
 * 编辑路径专用（创建路径由 `create-menu` 的判别联合契约在 400 层挡掉，进不到这里）：
 * 编辑面的 type 不可改，字段却可改，「把页面的 path 清空」这类改法只有拿既有 type 才判得出。
 * 传入的 path/permCode 必须是**合并后的终值**（未提交的字段取库里现值），
 * 否则 PATCH 语义下每次只改标签都会被判成"页面没有 path"。
 *
 * `action` 必带 permCode 这条 DB 侧另有 CHECK（menu_action_perm_check）兜底——
 * 那是挡绕过应用层写入的最后一道闸，不是主路径：撞到它拿到的是裸 500，不是可读的 422。
 */
export function assertMenuFieldsMatchType(
  type: MenuType,
  fields: { path: string | null; permCode: string | null },
): void {
  const problems: string[] = [];
  if (type === 'dir') {
    if (fields.path !== null) problems.push('dir_has_path');
    if (fields.permCode !== null) problems.push('dir_has_perm_code');
  }
  if (type === 'menu' && fields.path === null) problems.push('menu_missing_path');
  if (type === 'action') {
    if (fields.permCode === null) problems.push('action_missing_perm_code');
    if (fields.path !== null) problems.push('action_has_path');
  }
  if (problems.length > 0) {
    // params 给机器可读的问题标识（不是中文文案）：文案由前端按 code + params 渲染（ADR-005）
    throw new BizError('menu.field_type_mismatch', { type, problems });
  }
}
