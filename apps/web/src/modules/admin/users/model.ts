import type { CredentialSettings } from '@keel/core/settings-contract';
// users 纯派生逻辑（不 import React）。部门相关计算住在 depts/model.ts，这里只 import 不重写。
import { hasLegacyPositionFilter } from '@keel/core/user-filter-contract';
export { hasLegacyPositionFilter };
import { z } from 'zod';
import type { StatusBadgeTone } from '@/components/pro/StatusBadge';
import type { TablePrefs } from '@/stores/preferences';
import type { PickerPopoverLabels } from '@/components/pro/PickerPopover';
import type {
  FilterFieldDef,
  FilterOperator,
  FilterOption,
  FilterRoot,
} from '@/components/pro/filter-builder/types';
import type { DeptDto } from '@/modules/admin/depts/api';
import { deptPathLabel as formatDeptPathLabel } from '@/modules/admin/depts/model';
import type { UserDto } from './api';
import type { LogQuery } from './api/schema';
import { localDayStartIso } from '@/lib/datetime';
export type UserDeptPathNode = Pick<DeptDto, 'id' | 'parentId' | 'name'>;

/** 空值文案适配；路径/防环算法仍只有 depts/model 一处。 */
export function userDeptPathLabel(nodes: readonly UserDeptPathNode[], id: string | null): string {
  return formatDeptPathLabel(nodes, id ?? undefined) || '—';
}

export type UserDisplayStatus = 'active' | 'probation' | 'left' | 'disabled' | 'unset';

export function displayStatus(user: Pick<UserDto, 'status' | 'enabled'>): UserDisplayStatus {
  return user.enabled ? (user.status ?? 'unset') : 'disabled';
}

export function statusTone(status: UserDisplayStatus): StatusBadgeTone {
  if (status === 'active') return 'success';
  if (status === 'probation') return 'info';
  if (status === 'disabled') return 'danger';
  return 'neutral';
}

export { maskPhone } from '@/lib/mask-phone';

/** 头像取名字首字（板：林小雨 → 「林」），按码位切避免拆坏 surrogate pair */
export function initials(name: string) {
  return Array.from(name.trim())[0] ?? '';
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export type LastLoginTranslator = (
  key: 'today' | 'yesterday' | 'daysAgo',
  options?: { time?: string; count?: number },
) => string;

export function formatLastLogin(iso: string | null, now: Date, t: LastLoginTranslator) {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const time = `${pad2(at.getHours())}:${pad2(at.getMinutes())}`;
  const diffDays = Math.round((startOfDay(now) - startOfDay(at)) / DAY_MS);

  if (diffDays <= 0) return t('today', { time });
  if (diffDays === 1) return t('yesterday', { time });
  if (diffDays < 7) return t('daysAgo', { count: diffDays });
  return `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())}`;
}

// 形状契约来自 components/pro/filter-builder/types.ts（根为 and 链，允许一层分组，不支持组套组）。

const FilterOperatorSchema = z.enum([
  'eq',
  'ne',
  'contains',
  'in',
  'notIn',
  'gte',
  'lte',
  'between',
  'isEmpty',
  'isNotEmpty',
]);
const FilterValueSchema = z.union([z.string(), z.array(z.string()), z.null()]);
const FilterConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: FilterOperatorSchema,
  value: FilterValueSchema,
  // 缺省 = 含下级（与 expandDeptScope 旧语义一致）；只在关掉「含下级」时写 exact
  scope: z.enum(['exact']).optional(),
});
const FilterGroupSchema = z.object({
  id: z.string(),
  op: z.enum(['and', 'or']),
  items: z.array(FilterConditionSchema),
});
const FilterRootSchema = z.object({
  op: z.literal('and'),
  items: z.array(z.union([FilterGroupSchema, FilterConditionSchema])),
});

export const emptyFilters: FilterRoot = { op: 'and', items: [] };

/** URL 里的 filters 串 → FilterRoot；非法/空一律降级成空根，不抛错 */
export function parseFilters(raw: string | undefined | null): FilterRoot {
  if (!raw) return emptyFilters;
  try {
    const result = FilterRootSchema.safeParse(JSON.parse(raw) as unknown);
    return result.success ? result.data : emptyFilters;
  } catch {
    return emptyFilters;
  }
}

/** FilterRoot → URL 串；空条件返回空串，让 route 层把参数整个删掉 */
export function stringifyFilters(root: FilterRoot) {
  return root.items.length > 0 ? JSON.stringify(root) : '';
}

const TEXT_OPERATORS: FilterOperator[] = ['contains', 'eq', 'ne', 'isEmpty', 'isNotEmpty'];
const MULTI_OPERATORS: FilterOperator[] = ['in', 'notIn', 'isEmpty', 'isNotEmpty'];
const DATE_OPERATORS: FilterOperator[] = ['between', 'gte', 'lte', 'isEmpty', 'isNotEmpty'];
const TREE_OPERATORS: FilterOperator[] = ['in', 'notIn'];

export interface UserFilterFieldsContext {
  /** 文案翻译；key 相对 admin 命名空间下的 users.filters.* */
  t: (key: string) => string;
  /** tree 型字段（部门）的 PickerPopover 文案。带插值的 matchHint 用 t 表达不了，故由 UI 层注入 */
  pickerLabels: PickerPopoverLabels;
  depts?: readonly UserDeptPathNode[];
  roles?: readonly { id: string; name: string }[];
  posts?: readonly { id: string; name: string; enabled: boolean }[];
  workLocations?: readonly string[];
}

const EMPLOYMENT_TYPES = ['fulltime', 'parttime', 'intern', 'outsourced'] as const;
const USER_STATUSES = ['active', 'probation', 'left', 'disabled'] as const;

export function userFilterFields({
  t,
  pickerLabels,
  depts = [],
  roles = [],
  posts = [],
  workLocations = [],
}: UserFilterFieldsContext): FilterFieldDef[] {
  const deptOptions: FilterOption[] = depts.map((dept) => ({
    value: dept.id,
    label: dept.name,
    parentValue: dept.parentId,
  }));
  const roleOptions: FilterOption[] = roles.map((role) => ({ value: role.id, label: role.name }));
  const locationOptions: FilterOption[] = workLocations.map((value) => ({ value, label: value }));

  return [
    {
      key: 'deptId',
      label: t('fields.dept'),
      input: 'tree',
      operators: TREE_OPERATORS,
      options: deptOptions,
      pickerLabels,
    },
    {
      key: 'enabled',
      label: t('fields.enabled'),
      input: 'multiSelect',
      operators: MULTI_OPERATORS,
      options: [
        { value: 'true', label: t('enabledOn') },
        { value: 'false', label: t('enabledOff') },
      ],
    },
    {
      key: 'status',
      label: t('fields.status'),
      input: 'multiSelect',
      operators: MULTI_OPERATORS,
      options: USER_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
    },
    {
      key: 'roleIds',
      label: t('fields.roles'),
      input: 'multiSelect',
      operators: MULTI_OPERATORS,
      options: roleOptions,
    },
    {
      key: 'postId',
      label: t('fields.postId'),
      input: 'multiSelect',
      operators: MULTI_OPERATORS,
      options: posts.map((post) => ({ value: post.id, label: post.name })),
    },
    { key: 'joinedAt', label: t('fields.joinedAt'), input: 'dateRange', operators: DATE_OPERATORS },
    { key: 'lastLoginAt', label: t('fields.lastLoginAt'), input: 'dateRange', operators: DATE_OPERATORS },
    {
      key: 'employmentType',
      label: t('fields.employmentType'),
      input: 'multiSelect',
      operators: MULTI_OPERATORS,
      options: EMPLOYMENT_TYPES.map((value) => ({ value, label: t(`employmentType.${value}`) })),
    },
    {
      key: 'workLocation',
      label: t('fields.workLocation'),
      input: 'multiSelect',
      operators: MULTI_OPERATORS,
      options: locationOptions,
    },
    { key: 'phone', label: t('fields.phone'), input: 'text', operators: TEXT_OPERATORS },
    { key: 'email', label: t('fields.email'), input: 'text', operators: TEXT_OPERATORS },
  ];
}

// ── 服务端排序白名单（URL 协议；DataTable 不接 getSortedRowModel）──

const SORT_FIELDS = [
  'name',
  'employeeNo',
  'deptId',
  'postName',
  'joinedAt',
  'lastLoginAt',
  'status',
] as const;
export type UserSortField = (typeof SORT_FIELDS)[number];
export type UserSort = { field: UserSortField; dir: 'asc' | 'desc' };

const SORT_FIELD_SET = new Set<string>(SORT_FIELDS);

/** 排序字段白名单的 type guard：URL 是外部输入，收窄靠断言不算证明（review C7） */
function isUserSortField(value: string): value is UserSortField {
  return SORT_FIELD_SET.has(value);
}

export function parseSort(raw: string | undefined | null): UserSort | null {
  if (!raw) return null;
  const match = /^([a-zA-Z]+):(asc|desc)$/.exec(raw);
  if (!match) return null;
  const field = match[1] === 'position' ? 'postName' : match[1];
  const dir = match[2];
  if (!field || !isUserSortField(field) || (dir !== 'asc' && dir !== 'desc')) return null;
  return { field, dir };
}

export function stringifySort(
  sort: { field: string; dir: 'asc' | 'desc' } | null | undefined,
): string | undefined {
  if (!sort || !SORT_FIELD_SET.has(sort.field)) return undefined;
  return `${sort.field}:${sort.dir}`;
}

export function roleSummary(
  roleIds: readonly string[],
  roleNameById: ReadonlyMap<string, string>,
): { primary: string; extra: number } {
  const [first, ...rest] = roleIds;
  return {
    primary: first === undefined ? '' : (roleNameById.get(first) ?? first),
    extra: rest.length,
  };
}

export function isRowMuted(user: Pick<UserDto, 'status' | 'enabled'>): boolean {
  return !user.enabled || user.status === 'left';
}

export type PermissionChangeTone = 'add' | 'remove' | 'neutral';

/** 只新增角色 → add，只移除 → remove，其余（含同时增减、无角色差异）→ neutral。 */
export function permissionChangeTone(change: {
  addedRoleIds: readonly string[];
  removedRoleIds: readonly string[];
}): PermissionChangeTone {
  const added = change.addedRoleIds.length > 0;
  const removed = change.removedRoleIds.length > 0;
  if (added && !removed) return 'add';
  if (removed && !added) return 'remove';
  return 'neutral';
}

export function generateUserPassword(policy?: CredentialSettings): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  // 拒绝采样：256 % 56 = 32，直接取模会让字母表前 32 个字符多出现一次，落在末尾残周期的字节要丢掉重取
  const limit = 256 - (256 % alphabet.length);
  const length = policy ? Math.max(13, policy.minLength) - 4 : 12;
  let password = '';
  while (password.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length - password.length))) {
      if (byte >= limit) continue;
      password += alphabet.charAt(byte % alphabet.length);
    }
  }
  return policy ? `Aa2#${password}` : `${password}#`;
}

export const usersSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(15),
  keyword: z.string().catch(''),
  filters: z.string().optional(),
  schemeId: z.string().optional(),
  sort: z
    .string()
    .regex(/^[a-zA-Z]+:(asc|desc)$/)
    .optional()
    .catch(undefined),
});

export const userDetailSearchSchema = z.object({ list: usersSearchSchema.optional() });

export function detailNeighbor(
  rows: readonly { id: string }[],
  id: string,
  direction: -1 | 1,
  page: number,
  pageSize: number,
  total: number,
): { id?: string; page: number } | null {
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const neighbor = rows[index + direction];
  if (neighbor) return { id: neighbor.id, page };
  const nextPage = page + direction;
  return nextPage >= 1 && nextPage <= Math.ceil(total / pageSize) ? { page: nextPage } : null;
}

/** 列 id 由 position 改名为 postName 后，把旧本地存档的顺序、可见性和列宽映射到新 id。 */
export function migratePositionColumn(saved: TablePrefs): TablePrefs {
  const { position: positionVisible, ...visibility } = saved.visibility;
  const { position: positionWidth, ...sizing } = saved.sizing;

  return {
    ...saved,
    order: saved.order.map((id) => (id === 'position' ? 'postName' : id)),
    visibility: {
      ...visibility,
      ...(visibility.postName === undefined && positionVisible !== undefined
        ? { postName: positionVisible }
        : {}),
    },
    sizing: {
      ...sizing,
      ...(sizing.postName === undefined && positionWidth !== undefined ? { postName: positionWidth } : {}),
    },
  };
}

export interface UserPermissionLabel {
  code: string;
  type: 'dir' | 'menu' | 'action';
  label: Record<string, string>;
  page: Record<string, string> | null;
}

export interface UserPermissionGroup {
  page: string;
  items: { code: string; label: string; isPage: boolean }[];
}

const pickLabel = (label: Record<string, string> | null | undefined, language: string) =>
  label?.[language] ?? label?.['zh-CN'] ?? label?.['en-US'] ?? '';

/** 有效权限点按所属页面分组，权限点显示可读名称；目录里没有名称的码归到 fallbackPage 组并显示原码。 */
export function groupPermissionLabels(
  codes: readonly string[],
  labels: readonly UserPermissionLabel[],
  language: string,
  fallbackPage: string,
): UserPermissionGroup[] {
  const byCode = new Map(labels.map((item) => [item.code, item]));
  const groups = new Map<string, UserPermissionGroup>();
  for (const code of codes) {
    const known = byCode.get(code);
    const page = (known && pickLabel(known.page, language)) || fallbackPage;
    const group = groups.get(page) ?? { page, items: [] };
    group.items.push({
      code,
      label: (known && pickLabel(known.label, language)) || code,
      isPage: known?.type === 'menu',
    });
    groups.set(page, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.toSorted(
        (a, b) => Number(b.isPage) - Number(a.isPage) || a.code.localeCompare(b.code),
      ),
    }))
    .toSorted((a, b) =>
      a.page === fallbackPage ? 1 : b.page === fallbackPage ? -1 : a.page.localeCompare(b.page, language),
    );
}

export interface UserDeptTreeRow {
  id: string;
  name: string;
  depth: number;
  hasChildren: boolean;
  enabled: boolean;
}

/** 部门筛选侧栏的前序扁平树；有关键词时只保留命中节点及其祖先。兄弟顺序沿用 lookups 的返回顺序。 */
export function userDeptTreeRows(
  depts: readonly (UserDeptPathNode & { enabled?: boolean })[],
  keyword: string,
): UserDeptTreeRow[] {
  const term = keyword.trim().toLowerCase();
  const byId = new Map(depts.map((dept) => [dept.id, dept]));
  const include = new Set<string>();
  for (const dept of depts) {
    if (term && !dept.name.toLowerCase().includes(term)) continue;
    for (
      let current: UserDeptPathNode | undefined = dept;
      current && !include.has(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined
    ) {
      include.add(current.id);
    }
  }
  const children = new Map<string | null, (typeof depts)[number][]>();
  for (const dept of depts) {
    const parent = dept.parentId && byId.has(dept.parentId) ? dept.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), dept]);
  }
  const rows: UserDeptTreeRow[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const dept of children.get(parentId) ?? []) {
      if (!include.has(dept.id)) continue;
      rows.push({
        id: dept.id,
        name: dept.name,
        depth,
        hasChildren: (children.get(dept.id) ?? []).some((child) => include.has(child.id)),
        enabled: dept.enabled !== false,
      });
      visit(dept.id, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}

/** 部门人数：每个部门的合计含全部下级，与「含下级」的查询口径一致。 */
export function deptHeadcounts(
  depts: readonly { id: string; parentId: string | null }[],
  direct: readonly { deptId: string; count: number }[],
): Map<string, number> {
  const own = new Map(direct.map((row) => [row.deptId, row.count]));
  const parentOf = new Map(depts.map((dept) => [dept.id, dept.parentId]));
  const totals = new Map<string, number>();
  for (const dept of depts) {
    const count = own.get(dept.id) ?? 0;
    const seen = new Set<string>();
    for (let id: string | null | undefined = dept.id; id && !seen.has(id); id = parentOf.get(id)) {
      seen.add(id);
      totals.set(id, (totals.get(id) ?? 0) + count);
    }
  }
  return totals;
}

const DEPT_SCOPE_CONDITION_ID = 'dept-scope';
const DEPT_UNASSIGNED_CONDITION_ID = 'dept-unassigned';

const isUnassignedCondition = (node: FilterRoot['items'][number]) =>
  !('items' in node) && node.field === 'deptId' && node.operator === 'isEmpty';

/** 侧栏「未分配部门」对应的条件：部门为空。 */
export function deptUnassignedFromFilters(root: FilterRoot): boolean {
  return root.items.some(isUnassignedCondition);
}

export function withDeptUnassigned(root: FilterRoot, on: boolean): FilterRoot {
  const rest = withDeptScope(root, null).items;
  return {
    ...root,
    items: on
      ? [{ id: DEPT_UNASSIGNED_CONDITION_ID, field: 'deptId', operator: 'isEmpty', value: null }, ...rest]
      : rest,
  };
}

/** 侧栏部门选择对应的筛选条件：根层单值「部门属于」；缺省含下级，scope=exact 为仅本部门。 */
export function deptScopeFromFilters(root: FilterRoot): { deptId: string; includeChildren: boolean } | null {
  for (const node of root.items) {
    if ('items' in node || node.field !== 'deptId' || node.operator !== 'in') continue;
    const [only, ...rest] = Array.isArray(node.value) ? node.value : [];
    if (only && rest.length === 0) return { deptId: only, includeChildren: node.scope !== 'exact' };
  }
  return null;
}

export function withDeptScope(
  root: FilterRoot,
  scope: { deptId: string; includeChildren: boolean } | null,
): FilterRoot {
  const current = deptScopeFromFilters(root);
  const rest = root.items.filter(
    (node) =>
      !isUnassignedCondition(node) &&
      ('items' in node ||
        node.field !== 'deptId' ||
        node.operator !== 'in' ||
        !(
          current &&
          Array.isArray(node.value) &&
          node.value.length === 1 &&
          node.value[0] === current.deptId
        )),
  );
  if (!scope) return { ...root, items: rest };
  return {
    ...root,
    items: [
      {
        id: DEPT_SCOPE_CONDITION_ID,
        field: 'deptId',
        operator: 'in',
        value: [scope.deptId],
        ...(scope.includeChildren ? {} : { scope: 'exact' as const }),
      },
      ...rest,
    ],
  };
}

/** 审计 action → 展示用 i18n 后缀（users.logs.actions.*）；未收录返回 undefined。 */
const USER_AUDIT_ACTION_KEYS: Record<string, string> = {
  'user.create': 'create',
  'user.importUsers': 'import',
  'user.update': 'update',
  'user.changeStatus': 'status',
  'user.batchStatus': 'status',
  'user.changeAccountPolicy': 'policy',
  'user.changeEmployment': 'employment',
  'user.batchArchive': 'archive',
  'user.batchMove': 'move',
  'user.assignRoles': 'roles',
  'user.batchRoles': 'roles',
  'user.resetPassword': 'password',
  'user.batchResetPassword': 'password',
};

export function auditActionKey(action: string): string | undefined {
  return USER_AUDIT_ACTION_KEYS[action];
}

const DEVICE_BROWSERS: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'],
  [/(?:Chrome|CriOS)\/(\d+)/, 'Chrome'],
  [/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'],
  [/Version\/(\d+)[^]*Safari\//, 'Safari'],
];
const DEVICE_SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux|X11/, 'Linux'],
];

/** 把 User-Agent 归纳成「浏览器 版本 · 系统」；认不出时返回 null，由调用方回退原文。 */
export function describeDevice(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const browser = DEVICE_BROWSERS.map(([re, name]) => {
    const hit = re.exec(userAgent);
    return hit ? `${name} ${hit[1]}` : null;
  }).find(Boolean);
  const system = DEVICE_SYSTEMS.find(([re]) => re.test(userAgent))?.[1];
  const parts = [browser, system].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export type LogFilters = { status: string; range: [string, string] | null };
export const emptyLogFilters: LogFilters = { status: 'all', range: null };

/** 日期选择的起止（含止日）换成服务端开区间：[起日零点, 止日次日零点)。 */
export function logRangeQuery(range: LogFilters['range']): { from?: string; to?: string } {
  if (!range) return {};
  return {
    ...(range[0] ? { from: localDayStartIso(range[0]) } : {}),
    ...(range[1] ? { to: localDayStartIso(range[1], 1) } : {}),
  };
}

export const LOG_PAGE_SIZE = 20;

export function logQuery(page: number, filters: LogFilters): LogQuery {
  return {
    page,
    pageSize: LOG_PAGE_SIZE,
    ...(filters.status === 'all' ? {} : { status: filters.status }),
    ...logRangeQuery(filters.range),
  };
}

const DEFAULT_LIST_SEARCH = { page: 1, pageSize: 15, keyword: '' } as const;

/** 编辑页保存 / 取消后的去向：从列表直接进入的回列表（带回原筛选），否则回该用户详情。 */
export function userEditExit(
  from: 'list' | undefined,
  list: z.infer<typeof usersSearchSchema> | undefined,
  userId: string,
) {
  return from === 'list'
    ? ({ to: '/admin/users', search: list ?? DEFAULT_LIST_SEARCH } as const)
    : ({ to: '/admin/users/$userId', params: { userId }, search: { list } } as const);
}
