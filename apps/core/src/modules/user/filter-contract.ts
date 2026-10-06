import * as z from 'zod';

const textOperators = ['eq', 'ne', 'contains', 'isEmpty', 'isNotEmpty'];
const multiOperators = ['eq', 'ne', 'in', 'notIn', 'isEmpty', 'isNotEmpty'];
const dateOperators = ['gte', 'lte', 'between', 'isEmpty', 'isNotEmpty'];
const fields = z.enum([
  'name',
  'employeeNo',
  'account',
  'username',
  'phone',
  'email',
  'postId',
  'remark',
  'workLocation',
  'employmentType',
  'gender',
  'enabled',
  'status',
  'joinedAt',
  'lastLoginAt',
  'effectiveAt',
  'roleIds',
  'subsystemKeys',
  'deptId',
]);
const operators = z.enum([
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
const filterText = z.string().trim().min(1).max(256);
const dateValue = z.iso.date();

export const conditionSchema = z
  .object({
    id: z.string().min(1).max(64),
    field: fields,
    operator: operators,
    value: z.union([filterText, z.array(filterText).min(1).max(50), z.null()]),
    scope: z.literal('exact').optional(),
  })
  .strict()
  .superRefine((condition, ctx) => {
    const { field, operator, value, scope } = condition;
    const date = field === 'joinedAt' || field === 'lastLoginAt' || field === 'effectiveAt';
    const multi = [
      'workLocation',
      'employmentType',
      'gender',
      'enabled',
      'status',
      'roleIds',
      'subsystemKeys',
      'deptId',
      'postId',
    ].includes(field);
    const allowed = date ? dateOperators : multi ? multiOperators : textOperators;
    const invalid = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (!allowed.includes(operator)) invalid('字段不支持此运算符');
    if (scope !== undefined && field !== 'deptId') invalid('scope 仅适用于部门');
    if (operator === 'isEmpty' || operator === 'isNotEmpty') {
      if (value !== null) invalid('空值运算符必须使用 null');
      return;
    }
    if (operator === 'in' || operator === 'notIn' || operator === 'between') {
      if (!Array.isArray(value)) invalid('此运算符必须使用数组');
    } else if (typeof value !== 'string') invalid('此运算符必须使用字符串');
    const values = Array.isArray(value) ? value : value === null ? [] : [value];
    if (date && !values.every((item) => dateValue.safeParse(item).success))
      invalid('日期必须为有效 YYYY-MM-DD');
    if (operator === 'between' && (values.length !== 2 || (values[0] ?? '') > (values[1] ?? '')))
      invalid('日期区间必须为有序的两个端点');
    if (
      (field === 'roleIds' || field === 'deptId' || field === 'postId') &&
      !values.every((item) => z.uuid().safeParse(item).success)
    )
      invalid('关系字段必须使用 UUID');
    if (
      field === 'status' &&
      !values.every((item) => ['active', 'probation', 'left', 'disabled', 'unset'].includes(item))
    )
      invalid('未知用户展示状态');
    if (field === 'enabled' && !values.every((item) => item === 'true' || item === 'false'))
      invalid('账号开关必须为 true 或 false');
    if (field === 'gender' && !values.every((item) => ['male', 'female', 'other'].includes(item)))
      invalid('未知性别');
    if (field === 'subsystemKeys' && !values.every((item) => /^[a-z][a-z0-9_-]{0,63}$/.test(item)))
      invalid('无效子系统标识');
  });

const groupSchema = z
  .object({
    id: z.string().min(1).max(64),
    op: z.enum(['and', 'or']),
    items: z.array(conditionSchema).min(1).max(20),
  })
  .strict();
export const rootSchema = z
  .object({ op: z.literal('and'), items: z.array(z.union([conditionSchema, groupSchema])).max(20) })
  .strict()
  .superRefine((root, ctx) => {
    const count = root.items.reduce((sum, item) => sum + ('items' in item ? item.items.length : 1), 0);
    if (count > 20) ctx.addIssue({ code: 'custom', message: '最多支持 20 个筛选条件' });
  });

/** JSON 仍是线上参数形状；校验结构及字段语义，拒绝整份坏条件，不丢弃任何节点。 */
export const UserFiltersJsonSchema = z
  .string()
  .max(8192)
  .superRefine((raw, ctx) => {
    try {
      if (hasLegacyPositionFilter(raw)) {
        ctx.addIssue({ code: 'custom', message: '旧职位筛选需重新选择岗位' });
        return;
      }
      const result = rootSchema.safeParse(JSON.parse(raw));
      if (!result.success) ctx.addIssue({ code: 'custom', message: '无效用户筛选条件' });
    } catch {
      ctx.addIssue({ code: 'custom', message: '筛选条件必须为 JSON' });
    }
  });
const CurrentUserSortSchema = z.templateLiteral([
  z.enum(['name', 'employeeNo', 'deptId', 'postName', 'joinedAt', 'lastLoginAt', 'status']),
  ':',
  z.enum(['asc', 'desc']),
]);
export const UserSortSchema = z
  .union([CurrentUserSortSchema, z.enum(['position:asc', 'position:desc'])])
  .transform((value) =>
    value === 'position:asc' ? 'postName:asc' : value === 'position:desc' ? 'postName:desc' : value,
  );
export type Condition = z.infer<typeof conditionSchema>;

/** 只识别已持久化的一层筛选结构，不转换或丢弃旧条件。 */
export function hasLegacyPositionFilter(raw: string | undefined | null): boolean {
  if (!raw) return false;
  try {
    const shape = z
      .object({
        items: z.array(
          z.union([
            z.object({ field: z.string() }),
            z.object({ items: z.array(z.object({ field: z.string() })) }),
          ]),
        ),
      })
      .parse(JSON.parse(raw));
    return shape.items.some((item) =>
      'items' in item ? item.items.some((child) => child.field === 'position') : item.field === 'position',
    );
  } catch {
    return false;
  }
}
