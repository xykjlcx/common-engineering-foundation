import {
  UpdateUserSchema,
  UserFormSchema,
  type UserDetailDto,
  type UserFormInput,
  type UpdateUserInput,
} from '../api/schema';

function sameValue(next: unknown, previous: unknown): boolean {
  if (Array.isArray(next) && Array.isArray(previous)) {
    // 角色授权是集合；仅调整展示顺序不构成授权变更。
    const nextIds = new Set<unknown>(next),
      previousIds = new Set<unknown>(previous);
    return nextIds.size === previousIds.size && [...nextIds].every((id) => previousIds.has(id));
  }
  return Object.is(next, previous);
}

/** 只比较后端 PATCH 允许的字段；未修改的关联不触发额外授权/范围校验。 */
export function buildUserUpdate(baseline: UserDetailDto, values: UserFormInput): UpdateUserInput | null {
  const normalized = UserFormSchema.parse(values);
  const previous: Record<string, unknown> = baseline;
  const changed = Object.entries(normalized).filter(
    ([field, value]) =>
      field in UpdateUserSchema.shape &&
      field !== 'id' &&
      field !== 'version' &&
      !sameValue(value, previous[field]),
  );
  if (!changed.length) return null;
  return UpdateUserSchema.parse({
    ...Object.fromEntries(changed),
    id: baseline.id,
    version: baseline.version,
  });
}

const CHANGE_FIELDS = [
  'avatarId',
  'name',
  'employeeNo',
  'phone',
  'email',
  'gender',
  'deptId',
  'postId',
  'managerId',
  'employmentType',
  'joinedAt',
  'workLocation',
  'roleIds',
  'effectiveAt',
  'remark',
] as const;

export type UserChangeField = (typeof CHANGE_FIELDS)[number];
export interface UserFormChange {
  field: UserChangeField;
  from: unknown;
  to: unknown;
}

/** 表单初始值与当前值的差异，供「本次变更」摘要展示；比较口径与 buildUserUpdate 一致。 */
export function userFormChanges(baseline: UserDetailDto, values: UserFormInput): UserFormChange[] {
  const previous: Record<string, unknown> = baseline;
  const current: Record<string, unknown> = values;
  return CHANGE_FIELDS.flatMap((field) =>
    sameValue(current[field] ?? null, previous[field] ?? null)
      ? []
      : [{ field, from: previous[field] ?? null, to: current[field] ?? null }],
  );
}
