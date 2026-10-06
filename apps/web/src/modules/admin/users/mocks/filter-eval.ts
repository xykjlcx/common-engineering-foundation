// 前端筛选/排序求值器：只有 mock 后端（demo 与 msw fixtures）需要在本地对 users 做筛选与排序，
// 真实链路由 core 的 SQL 完成。形状契约来自 components/pro/filter-builder/types.ts
//（根为 and 链，允许一层分组，不支持组套组）。
import type { FilterCondition, FilterGroup, FilterRoot } from '@/components/pro/filter-builder/types';
import { isFilterGroup } from '@/components/pro/filter-builder/types';
import type { UserDto } from '../api';
import {
  displayStatus,
  parseSort,
  userDeptPathLabel,
  type UserDeptPathNode,
  type UserDisplayStatus,
} from '../model';

export interface UserFilterContext {
  /** 部门条件含下级：给定部门 id 返回其自身 + 全部子孙。缺省视为不含下级 */
  deptDescendants?: (deptId: string) => ReadonlySet<string> | undefined;
}

type FieldKind = 'text' | 'array' | 'dept';

interface FieldAccessor {
  kind: FieldKind;
  read: (user: UserDto) => string | string[];
}

const fieldAccessors: Record<string, FieldAccessor> = {
  name: { kind: 'text', read: (u) => u.name },
  employeeNo: { kind: 'text', read: (u) => u.employeeNo ?? '' },
  account: { kind: 'text', read: (u) => u.account },
  phone: { kind: 'text', read: (u) => u.phone },
  email: { kind: 'text', read: (u) => u.email ?? '' },
  postId: { kind: 'array', read: (u) => (u.postId ? [u.postId] : []) },
  workLocation: { kind: 'text', read: (u) => u.workLocation ?? '' },
  employmentType: { kind: 'text', read: (u) => u.employmentType ?? '' },
  status: { kind: 'text', read: (u) => displayStatus(u) },
  gender: { kind: 'text', read: (u) => u.gender ?? '' },
  joinedAt: { kind: 'text', read: (u) => u.joinedAt ?? '' },
  lastLoginAt: { kind: 'text', read: (u) => u.lastLoginAt ?? '' },
  enabled: { kind: 'text', read: (u) => String(u.enabled) },
  remark: { kind: 'text', read: (u) => u.remark ?? '' },
  effectiveAt: { kind: 'text', read: (u) => u.effectiveAt ?? '' },
  roleIds: { kind: 'array', read: (u) => u.roleIds },
  deptId: { kind: 'dept', read: (u) => u.deptId ?? '' },
};

function toList(value: FilterCondition['value']): string[] {
  if (value === null) return [];
  if (Array.isArray(value)) return value.filter((item) => item !== '' && item != null);
  return value === '' ? [] : [value];
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function expandDeptScope(values: string[], ctx: UserFilterContext) {
  const scope = new Set<string>();
  for (const value of values) {
    scope.add(value);
    for (const id of ctx.deptDescendants?.(value) ?? []) scope.add(id);
  }
  return scope;
}

function matchCondition(user: UserDto, condition: FilterCondition, ctx: UserFilterContext): boolean {
  const accessor = fieldAccessors[condition.field];
  // 未知字段不参与过滤（前端筛选不是安全边界，宁可放行也不误杀）
  if (!accessor) return true;

  const raw = accessor.read(user);
  const actualList = Array.isArray(raw) ? raw : [raw];
  const operator = condition.operator;

  if (operator === 'isEmpty') return actualList.every((item) => item.trim() === '');
  if (operator === 'isNotEmpty') return actualList.some((item) => item.trim() !== '');

  const expected = toList(condition.value);
  // 空值条件视为「未填写」，不参与过滤（编辑中的草稿会走到这里）
  if (expected.length === 0) return true;

  if (accessor.kind === 'dept') {
    const scope = condition.scope === 'exact' ? new Set(expected) : expandDeptScope(expected, ctx);
    const hit = actualList.some((item) => scope.has(item));
    if (operator === 'notIn' || operator === 'ne') return !hit;
    return hit;
  }

  if (accessor.kind === 'array') {
    const actualSet = new Set(actualList.map(normalize));
    const hit = expected.some((item) => actualSet.has(normalize(item)));
    if (operator === 'notIn' || operator === 'ne') return !hit;
    return hit;
  }

  const actual = actualList[0] ?? '';
  switch (operator) {
    case 'eq':
      return expected.some((item) => normalize(actual) === normalize(item));
    case 'ne':
      return !expected.some((item) => normalize(actual) === normalize(item));
    case 'contains':
      return expected.every((item) => normalize(actual).includes(normalize(item)));
    case 'in':
      return expected.some((item) => normalize(actual) === normalize(item));
    case 'notIn':
      return !expected.some((item) => normalize(actual) === normalize(item));
    case 'gte':
      return actual !== '' && actual >= (expected[0] ?? '');
    case 'lte':
      return actual !== '' && actual <= (expected[0] ?? '');
    case 'between': {
      const [from, to] = expected;
      if (actual === '') return false;
      if (from && actual < from) return false;
      if (to && actual > to) return false;
      return true;
    }
    default:
      return true;
  }
}

function matchGroup(user: UserDto, group: FilterGroup, ctx: UserFilterContext): boolean {
  // 契约只允许一层分组：组内出现嵌套组时忽略该节点，不递归（pro 侧也不会产出这种形状）
  const conditions = group.items.filter((item): item is FilterCondition => !isFilterGroup(item));
  if (conditions.length === 0) return true;
  return group.op === 'or'
    ? conditions.some((item) => matchCondition(user, item, ctx))
    : conditions.every((item) => matchCondition(user, item, ctx));
}

/** 求值 FilterRoot：根为 and 链，组内按 group.op 求值（组不套组，与 pro 契约一致） */
export function matchUserFilters(user: UserDto, root: FilterRoot, ctx: UserFilterContext = {}): boolean {
  return root.items.every((node) =>
    isFilterGroup(node) ? matchGroup(user, node, ctx) : matchCondition(user, node, ctx),
  );
}

/** 关键词命中：板搜索框提示「姓名 / 工号 / 手机 / 邮箱…」 */
export function matchUserKeyword(user: UserDto, keyword: string) {
  const normalized = normalize(keyword);
  if (!normalized) return true;
  return [user.name, user.employeeNo, user.phone, user.email, user.account].some((value) =>
    (value ?? '').toLowerCase().includes(normalized),
  );
}

const STATUS_SORT_ORDER: Record<UserDisplayStatus, number> = {
  active: 0,
  probation: 1,
  left: 2,
  disabled: 3,
  unset: 4,
};

type SortableUser = Pick<
  UserDto,
  'name' | 'employeeNo' | 'deptId' | 'postName' | 'joinedAt' | 'lastLoginAt' | 'status' | 'enabled'
>;

/** 白名单排序。`deptId` 按部门路径名；`status` 按 displayStatus 的 active < probation < left < disabled */
export function sortUsers<T extends SortableUser>(
  list: readonly T[],
  sort: string | undefined | null,
  depts: readonly UserDeptPathNode[] = [],
): T[] {
  const parsed = parseSort(sort);
  if (!parsed) return [...list];
  const sign = parsed.dir === 'asc' ? 1 : -1;
  const valueOf = (user: T): string | number => {
    if (parsed.field === 'status') return STATUS_SORT_ORDER[displayStatus(user)];
    if (parsed.field === 'deptId') return userDeptPathLabel(depts, user.deptId);
    if (parsed.field === 'lastLoginAt') return user.lastLoginAt ?? '';
    return user[parsed.field] ?? '';
  };
  return [...list].sort((left, right) => {
    const av = valueOf(left);
    const bv = valueOf(right);
    if (av < bv) return -1 * sign;
    if (av > bv) return 1 * sign;
    return 0;
  });
}
