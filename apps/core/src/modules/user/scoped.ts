import { and, asc, count, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import type * as z from 'zod';
import type { Ctx, DbExec } from '../../kernel/context.js';
import { PermissionError } from '../../kernel/errors.js';
import { PG_REFERENCE_VIOLATION, PG_UNIQUE_VIOLATION, violatedConstraint } from '../../kernel/pg-error.js';
import { denyAll, type ScopedOptions } from '../../kernel/scoped.js';
import type { UserProfileSchema } from './contract.js';
import { postNameSql } from '../post/api.js';
import { appUsers, userRoles, type UserStatus } from './schema.js';
import { userColumns } from './user-columns.js';

function activeDataScopeSql(ctx: Pick<Ctx, 'scope' | 'userId'>): SQL {
  if (typeof ctx.scope === 'object') {
    const conditions: SQL[] = [];
    if (ctx.scope.ids.length) conditions.push(inArray(appUsers.id, [...ctx.scope.ids]));
    if (ctx.scope.unitIds.length) conditions.push(inArray(appUsers.deptId, [...ctx.scope.unitIds]));
    return or(...conditions) ?? denyAll();
  }
  switch (ctx.scope) {
    case 'all':
      return sql`true`;
    case 'own':
      return eq(appUsers.id, ctx.userId);
    default:
      return denyAll();
  }
}

export function userScopeSql(ctx: Pick<Ctx, 'scope' | 'userId'>): SQL {
  return and(isNull(appUsers.deletedAt), activeDataScopeSql(ctx)) ?? denyAll();
}

export function visibleUsers(ctx: Pick<Ctx, 'db' | 'scope' | 'userId'>, opts: ScopedOptions = {}) {
  return ctx.db
    .select({ ...userColumns, postName: postNameSql(appUsers.postId) })
    .from(appUsers)
    .where(and(userScopeSql(ctx), opts.where))
    .$dynamic();
}

/** total 与当前页必须使用同一可见性谓词，避免泄露范围外数量。 */
export function countVisibleUsers(ctx: Pick<Ctx, 'db' | 'scope' | 'userId'>, opts: ScopedOptions = {}) {
  return ctx.db
    .select({ total: count() })
    .from(appUsers)
    .where(and(userScopeSql(ctx), opts.where))
    .$dynamic();
}

/** 按所属部门分组的可见人数；deptId 为 null 的组即未分配部门。 */
export function countVisibleUsersByDept(ctx: Pick<Ctx, 'db' | 'scope' | 'userId'>) {
  return ctx.db
    .select({ deptId: appUsers.deptId, total: count() })
    .from(appUsers)
    .where(userScopeSql(ctx))
    .groupBy(appUsers.deptId);
}

/** 资料编辑不得改凭据、账号状态与管理员资格；各生命周期操作使用专属写入面。 */
export type UserProfilePatch = Partial<Omit<z.infer<typeof UserProfileSchema>, 'employmentStatus'>>;

const ACCOUNT_PATCH_KEYS = ['name', 'email', 'phone', 'deptId', 'managerId', 'avatarId'] as const;

// employmentStatus 不在此列：离职有账号与会话副作用，只能走专属生命周期命令。
const HR_PROFILE_PATCH_KEYS = [
  'employeeNo',
  'postId',
  'gender',
  'employmentType',
  'joinedAt',
  'workLocation',
  'remark',
] as const;

export const USER_PROFILE_PATCH_KEYS = [
  ...ACCOUNT_PATCH_KEYS,
  ...HR_PROFILE_PATCH_KEYS,
] as const satisfies readonly (keyof UserProfilePatch)[];

type WriteCtx = Pick<Ctx, 'scope' | 'userId' | 'clock'>;

function scopedRowTarget(ctx: Pick<Ctx, 'scope' | 'userId'>, id: string, version: number) {
  return and(eq(appUsers.id, id), eq(appUsers.version, version), userScopeSql(ctx));
}

function versionBump(ctx: Pick<Ctx, 'clock'>) {
  return { version: sql`${appUsers.version} + 1`, updatedAt: ctx.clock.now() };
}

export function updateUserScoped(
  ctx: WriteCtx,
  tx: DbExec,
  args: { id: string; version: number; set: UserProfilePatch },
) {
  return tx
    .update(appUsers)
    .set({ ...args.set, ...versionBump(ctx) })
    .where(scopedRowTarget(ctx, args.id, args.version))
    .returning(userColumns);
}

export function changeUserStatusScoped(
  ctx: WriteCtx,
  tx: DbExec,
  args: { id: string; version: number; status: UserStatus },
) {
  return tx
    .update(appUsers)
    .set({ status: args.status, ...versionBump(ctx) })
    .where(scopedRowTarget(ctx, args.id, args.version))
    .returning(userColumns);
}

/** 账号策略专属写入面：沿用 version+scope 定位，不放宽资料编辑字段。 */
export async function changeAccountPolicyScoped(
  ctx: WriteCtx,
  tx: DbExec,
  args: { id: string; version: number; effectiveAt: Date | null; mustChangePassword: boolean },
) {
  return tx
    .update(appUsers)
    .set({ effectiveAt: args.effectiveAt, mustChangePassword: args.mustChangePassword, ...versionBump(ctx) })
    .where(scopedRowTarget(ctx, args.id, args.version))
    .returning(userColumns);
}

/** 仅接收已计算哈希；公开 RETURNING 投影不包含凭据。 */
export function resetUserPasswordScoped(
  ctx: WriteCtx,
  tx: DbExec,
  args: { id: string; version: number; passwordHash: string; mustChangePassword?: boolean },
) {
  return tx
    .update(appUsers)
    .set({
      passwordHash: args.passwordHash,
      mustChangePassword: args.mustChangePassword ?? true,
      ...versionBump(ctx),
    })
    .where(scopedRowTarget(ctx, args.id, args.version))
    .returning(userColumns);
}

/** 授权集合属于用户聚合，替换必须与用户版本推进在同一事务完成。 */
export function bumpUserVersionScoped(ctx: WriteCtx, tx: DbExec, args: { id: string; version: number }) {
  return tx
    .update(appUsers)
    .set(versionBump(ctx))
    .where(scopedRowTarget(ctx, args.id, args.version))
    .returning(userColumns);
}

export interface UserCreateValues {
  username: string;
  name: string;
  email: string | null;
  phone: string;
  passwordHash: string;
  deptId?: string | null;
  avatarId?: string | null;
  managerId?: string | null;
  employeeNo?: string | null;
  postId?: string | null;
  gender?: string | null;
  employmentType?: string | null;
  employmentStatus?: string | null;
  joinedAt?: string | null;
  workLocation?: string | null;
  remark?: string | null;
  mustChangePassword?: boolean;
  effectiveAt?: Date | null;
}

export function insertUserScoped(
  ctx: Pick<Ctx, 'scope' | 'clock' | 'idgen'>,
  tx: DbExec,
  values: UserCreateValues,
) {
  assertUserCreateScope(ctx, values.deptId);
  const now = ctx.clock.now();
  return tx
    .insert(appUsers)
    .values({
      ...values,
      id: ctx.idgen(),
      status: values.employmentStatus === 'left' ? 'disabled' : 'active',
      isSystemAdmin: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning(userColumns);
}

const ROLE_GRANT_ROLE_FK: readonly string[] = ['user_role_role_id_role_id_fk'];

/** 邮箱冲突需识别列级唯一约束与忽略大小写的唯一索引。 */
const EMAIL_UNIQUE_CONSTRAINTS: readonly string[] = ['app_user_email_unique', 'app_user_email_lower_idx'];

/** 用户名冲突需识别列级唯一约束与忽略大小写的唯一索引。 */
const USERNAME_UNIQUE_CONSTRAINTS: readonly string[] = [
  'app_user_username_unique',
  'app_user_username_lower_idx',
];

export function isEmailUniqueViolation(e: unknown): boolean {
  const constraint = violatedConstraint(e, PG_UNIQUE_VIOLATION);
  return constraint !== null && EMAIL_UNIQUE_CONSTRAINTS.includes(constraint);
}

export function isUsernameUniqueViolation(e: unknown): boolean {
  const constraint = violatedConstraint(e, PG_UNIQUE_VIOLATION);
  return constraint !== null && USERNAME_UNIQUE_CONSTRAINTS.includes(constraint);
}

/** 映射角色预查后被删除的竞态，使授权请求返回可重试错误。 */
export function isRoleGrantMissingRoleViolation(e: unknown): boolean {
  const constraint = violatedConstraint(e, PG_REFERENCE_VIOLATION);
  return constraint !== null && ROLE_GRANT_ROLE_FK.includes(constraint);
}

/** 登录与创建预查均须匹配 DB 的大小写无关唯一索引。 */
function usernameMatches(username: string): SQL {
  return sql`lower(${appUsers.username}) = lower(${username})`;
}

/** 登录尚无主体，必须全表匹配；查询侧归一兼容未经应用归一的存量账号。 */
export function findByUsernameRaw(db: DbExec, username: string) {
  return db
    .select()
    .from(appUsers)
    .where(and(usernameMatches(username), isNull(appUsers.deletedAt)))
    .limit(1);
}

/** ③豁免：主体装配面——PrincipalLoader 按会话行装配权限，发生在 scope 产生之前 */
export function findByIdRaw(db: DbExec, id: string) {
  return db
    .select()
    .from(appUsers)
    .where(and(eq(appUsers.id, id), isNull(appUsers.deletedAt)))
    .limit(1);
}

/** 邮箱全局唯一，预查与 DB lower(email) 索引保持一致；注销账号不释放占用（索引也不过滤 deletedAt）。 */
async function emailMatchExists(db: DbExec, email: string, excludeId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(
      and(
        sql`lower(${appUsers.email}) = lower(${email})`,
        excludeId === undefined ? undefined : ne(appUsers.id, excludeId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** ③豁免：唯一性校验面（创建路径）——email 全局唯一，冲突判定必须跨 scope 全表看 */
export function emailTaken(db: DbExec, email: string): Promise<boolean> {
  return emailMatchExists(db, email);
}

/** ③豁免：唯一性校验面（更新路径）——同上，另需排除目标自身（"没改邮箱"不算冲突） */
export function emailTakenByOther(db: DbExec, email: string, excludeId: string): Promise<boolean> {
  return emailMatchExists(db, email, excludeId);
}

/** 用户名全局唯一，预查须跨范围并忽略大小写。 */
export async function usernameTaken(db: DbExec, username: string): Promise<boolean> {
  const rows = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(and(usernameMatches(username), isNull(appUsers.deletedAt)))
    .limit(1);
  return rows.length > 0;
}

// ── 授权关系表（user_role）收口 ───────────────────────────────────────────────
// 归属敏感表登记后，切片与 domain 一律不得裸碰 userRoles：授权关系既是提权面又是
// 可见性判据，散在各处的 insert/delete 会让"谁能授出什么"失去单一审查点。

/** ③豁免：主体装配与授权校验需要目标的角色集合，只回 roleId，不透露任何账号资料。 */
export async function roleIdsOfUserRaw(db: DbExec, userId: string): Promise<string[]> {
  const rows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .orderBy(asc(userRoles.roleId));
  return [...new Set(rows.map((row) => row.roleId))];
}

/** ③豁免：详情页展示授予事实（来源与时间）；调用方须先确认目标在可见范围内。 */
export function roleGrantsOfUserRaw(db: DbExec, userId: string) {
  return db
    .select({ roleId: userRoles.roleId, grantedBy: userRoles.grantedBy, grantedAt: userRoles.createdAt })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .orderBy(asc(userRoles.roleId));
}

/** ③豁免：列表与导出按已可见的用户 id 集批量取角色，入参即范围，不自行扩集。 */
export async function roleGrantsOfUsersRaw(db: DbExec, userIds: readonly string[]) {
  if (!userIds.length) return [];
  return db
    .select({ userId: userRoles.userId, roleId: userRoles.roleId })
    .from(userRoles)
    .where(inArray(userRoles.userId, [...userIds]));
}

/** 撤销授权：不传 roleIds 表示清空该用户全部授权（注销路径）。 */
export function revokeUserRolesScoped(tx: DbExec, userId: string, roleIds?: readonly string[]) {
  return tx
    .delete(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        roleIds === undefined ? undefined : inArray(userRoles.roleId, [...roleIds]),
      ),
    );
}

/** 授出授权：来源与时间由基座记录，调用方须先完成防提权与范围校验。 */
export function grantUserRolesScoped(
  ctx: Pick<Ctx, 'clock' | 'userId'>,
  tx: DbExec,
  userId: string,
  roleIds: readonly string[],
) {
  return tx
    .insert(userRoles)
    .values(roleIds.map((roleId) => ({ userId, roleId, grantedBy: ctx.userId, createdAt: ctx.clock.now() })));
}

/** 授权能力的内部检查：查角色实际覆盖的主体，只返回范围锚，不暴露给HTTP目录。 */
export function roleSubjectsRaw(db: DbExec, roleId: string) {
  return db
    .select({ id: appUsers.id, deptId: appUsers.deptId })
    .from(appUsers)
    .innerJoin(userRoles, eq(userRoles.userId, appUsers.id))
    .where(eq(userRoles.roleId, roleId));
}

/** 生命周期专属写面：离职与注销只会关闭账号，不会在返聘时隐式恢复登录。 */
export function changeEmploymentScoped(
  ctx: WriteCtx,
  tx: DbExec,
  args: { id: string; version: number; employmentStatus: 'probation' | 'active' | 'left' },
) {
  return tx
    .update(appUsers)
    .set({
      employmentStatus: args.employmentStatus,
      ...(args.employmentStatus === 'left' ? { status: 'disabled' } : {}),
      ...versionBump(ctx),
    })
    .where(scopedRowTarget(ctx, args.id, args.version))
    .returning(userColumns);
}
export function archiveUserScoped(ctx: WriteCtx, tx: DbExec, args: { id: string; version: number }) {
  return tx
    .update(appUsers)
    .set({ deletedAt: ctx.clock.now(), status: 'disabled', ...versionBump(ctx) })
    .where(scopedRowTarget(ctx, args.id, args.version))
    .returning(userColumns);
}

/** 创建没有既有目标行，以可分配部门检查同一数据范围。 */
export function assertUserCreateScope(ctx: Pick<Ctx, 'scope'>, deptId: string | null | undefined): void {
  if (
    ctx.scope !== 'all' &&
    !(typeof ctx.scope === 'object' && deptId && ctx.scope.unitIds.includes(deptId))
  ) {
    throw new PermissionError({ scope: ctx.scope, reason: 'create_requires_all_scope' });
  }
}
/** ③豁免：员工号全局唯一性校验必须跨scope，但只回是否占用，不透露账号资料。 */
export async function employeeNoTaken(db: DbExec, employeeNo: string): Promise<boolean> {
  const rows = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.employeeNo, employeeNo))
    .limit(1);
  return rows.length > 0;
}
export function isEmployeeNoUniqueViolation(error: unknown): boolean {
  return violatedConstraint(error, PG_UNIQUE_VIOLATION) === 'app_user_employee_no_unique';
}

/** ③豁免：组织/角色管理展示引用计数，不返回成员资料；可选包含注销用于FK删除检查。 */
export async function countRoleUsersRaw(db: DbExec, roleIds: readonly string[]) {
  if (!roleIds.length) return new Map<string, number>();
  const rows = await db
    .select({ id: userRoles.roleId, count: count() })
    .from(userRoles)
    .innerJoin(appUsers, eq(userRoles.userId, appUsers.id))
    .where(and(inArray(userRoles.roleId, [...roleIds]), isNull(appUsers.deletedAt)))
    .groupBy(userRoles.roleId);
  return new Map(rows.map((row) => [row.id, row.count]));
}
export async function countDepartmentUsersRaw(
  db: DbExec,
  deptIds: readonly string[],
  includeArchived = false,
) {
  if (!deptIds.length) return new Map<string, number>();
  const rows = await db
    .select({ id: appUsers.deptId, count: count() })
    .from(appUsers)
    .where(
      and(inArray(appUsers.deptId, [...deptIds]), includeArchived ? undefined : isNull(appUsers.deletedAt)),
    )
    .groupBy(appUsers.deptId);
  return new Map(rows.flatMap((row) => (row.id ? [[row.id, row.count]] : [])));
}

/** ③豁免：已授权组织配置展示真实负责人引用，严格限于 id/name/employeeNo。 */
export async function departmentLeaderReferencesRaw(db: DbExec, ids: readonly string[]) {
  if (!ids.length) return [];
  return db
    .select({ id: appUsers.id, name: appUsers.name, employeeNo: appUsers.employeeNo })
    .from(appUsers)
    .where(and(inArray(appUsers.id, [...ids]), isNull(appUsers.deletedAt)));
}
/** ③豁免：只有组织写入口的超管资格可调用，搜索口径限于返回字段，不返回账号凭据。 */
export async function departmentLeaderOptionsRaw(
  db: DbExec,
  input: { keyword?: string; page: number; pageSize: number; selectedId?: string },
) {
  const pattern = input.keyword ? `%${input.keyword.replace(/[\\%_]/g, '\\$&')}%` : undefined;
  const where = and(
    isNull(appUsers.deletedAt),
    pattern ? or(ilike(appUsers.name, pattern), ilike(appUsers.employeeNo, pattern)) : undefined,
  );
  const [list, totals, selected] = await Promise.all([
    db
      .select({ id: appUsers.id, name: appUsers.name, employeeNo: appUsers.employeeNo })
      .from(appUsers)
      .where(where)
      .orderBy(asc(appUsers.name), asc(appUsers.id))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
    db.select({ total: count() }).from(appUsers).where(where),
    input.selectedId ? departmentLeaderReferencesRaw(db, [input.selectedId]) : [],
  ]);
  return { list, total: totals[0]?.total ?? 0, selected: selected[0] ?? null };
}

/** 删除岗位的完整引用检查：含归档账号，只返回人数，不暴露范围外名单。 */
export async function countPostReferencesRaw(db: DbExec, postId: string) {
  const [row] = await db.select({ total: count() }).from(appUsers).where(eq(appUsers.postId, postId));
  return row?.total ?? 0;
}

/** 全站审计已由独立权限守门，仅返回现存账号的最小身份，不携带凭据与组织资料。 */
export async function auditIdentitiesRaw(db: DbExec, ids: readonly string[]) {
  return departmentLeaderReferencesRaw(db, ids);
}

/** 会话审计独立权限允许全局关键词查找，只返回匹配身份ID。 */
export async function auditSubjectIdsRaw(db: DbExec, keyword: string) {
  const pattern = `%${keyword.replace(/[\\%_]/g, '\\$&')}%`;
  return db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(
      and(
        isNull(appUsers.deletedAt),
        sql`(${appUsers.name} ilike ${pattern} escape '\\' or ${appUsers.employeeNo} ilike ${pattern} escape '\\')`,
      ),
    );
}

export async function countVisibleUsersWithoutRole(ctx: Pick<Ctx, 'db' | 'scope' | 'userId'>) {
  const [row] = await countVisibleUsers(ctx, {
    where: and(
      eq(appUsers.status, 'active'),
      sql`not exists (select 1 from ${userRoles} where ${userRoles.userId} = ${appUsers.id})`,
    ),
  });
  return row?.total ?? 0;
}

/** 公告独立发布权限允许全局广播，只回投递ID；不暴露用户目录或继承操作者数据范围。 */
export function noticeRecipientsRaw(db: DbExec, now: Date, audience: string, ids: string[]) {
  const eligible = and(
    isNull(appUsers.deletedAt),
    eq(appUsers.status, 'active'),
    or(isNull(appUsers.employmentStatus), ne(appUsers.employmentStatus, 'left')),
    or(isNull(appUsers.effectiveAt), sql`${appUsers.effectiveAt} <= ${now}`),
    audience === 'departments' ? inArray(appUsers.deptId, ids) : undefined,
    audience === 'roles'
      ? sql`exists (select 1 from ${userRoles} where ${userRoles.userId} = ${appUsers.id} and ${inArray(userRoles.roleId, ids)})`
      : undefined,
  );
  return db.select({ id: appUsers.id }).from(appUsers).where(eligible).orderBy(asc(appUsers.id));
}
