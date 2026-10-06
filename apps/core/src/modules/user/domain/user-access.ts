import * as z from 'zod';
import { eq, inArray } from 'drizzle-orm';
import type { Ctx, DbExec, TxCtx } from '../../../kernel/context.js';
import { BizError } from '../../../kernel/errors.js';
import { getLastLogins } from '../../auth/api.js';
import { getDepartment } from '../../dept/api.js';
import { resolveRoleScope } from '../../role/api.js';
import { roles } from '../../role/schema.js';
import { appUsers } from '../schema.js';
import { getAuthUserById } from './user-credentials.js';
import {
  auditIdentitiesRaw,
  auditSubjectIdsRaw,
  countDepartmentUsersRaw,
  countPostReferencesRaw,
  countRoleUsersRaw,
  departmentLeaderOptionsRaw,
  departmentLeaderReferencesRaw,
  roleIdsOfUserRaw,
  roleSubjectsRaw,
  updateUserScoped,
  visibleUsers,
} from '../scoped.js';
import { userView } from './user-view.js';
import { USER_PERMS } from '../permissions.js';

/** 不存在的用户返回空集合；调用方负责确认账号资格。 */
export function getRoleIdsOfUser(db: DbExec, userId: string): Promise<string[]> {
  return roleIdsOfUserRaw(db, userId);
}

export function getRoleSubjects(db: DbExec, roleId: string) {
  return roleSubjectsRaw(db, roleId);
}

/** 文件下载仅认可当前操作范围内用户实际绑定的头像。 */
export async function canReadAvatar(ctx: Ctx, fileId: string): Promise<boolean> {
  const own = await visibleUsers({ ...ctx, scope: 'own' }, { where: eq(appUsers.avatarId, fileId) }).limit(1);
  if (own.length) return true;
  if (!ctx.isSuperuser && !ctx.permissions.has(USER_PERMS.view)) return false;
  const actor = await getAuthUserById(ctx.db, ctx.userId);
  if (!actor) return false;
  const scope = ctx.isSuperuser
    ? 'all'
    : await resolveRoleScope(ctx.db, await getRoleIdsOfUser(ctx.db, actor.id), USER_PERMS.view, actor);
  return (
    (await visibleUsers({ ...ctx, scope }, { where: eq(appUsers.avatarId, fileId) }).limit(1)).length > 0
  );
}

export function countUsersOfRoles(db: DbExec, ids: readonly string[]) {
  return countRoleUsersRaw(db, ids);
}
export function countUsersOfDepartments(db: DbExec, ids: readonly string[], includeArchived = false) {
  return countDepartmentUsersRaw(db, ids, includeArchived);
}

/** 本人资料的关联显示名只从本人已绑定引用读取，不接受任意目标ID。 */
export async function getOwnProfile(ctx: Ctx) {
  const [user] = await visibleUsers({ ...ctx, scope: 'own' }).limit(1);
  if (!user) throw new BizError('user.not_found');
  const roleIds = await getRoleIdsOfUser(ctx.db, user.id);
  const [department, manager, granted, lastLogins] = await Promise.all([
    user.deptId ? getDepartment(ctx.db, user.deptId) : null,
    user.managerId ? getAuthUserById(ctx.db, user.managerId) : null,
    roleIds.length ? ctx.db.select({ name: roles.name }).from(roles).where(inArray(roles.id, roleIds)) : [],
    getLastLogins(ctx.db, [user.id]),
  ]);
  return {
    ...userView(user, roleIds, lastLogins.get(user.id) ?? null),
    deptName: department?.[0]?.name ?? null,
    managerName: manager?.name ?? null,
    roleNames: granted.map((role) => role.name).sort(),
  };
}
export async function updateOwnProfile(
  ctx: TxCtx,
  input: {
    version: number;
    name?: string;
    phone?: string;
    workLocation?: string | null;
    remark?: string | null;
  },
) {
  const before = await getOwnProfile(ctx);
  const { version, ...set } = input;
  const [updated] = await updateUserScoped({ ...ctx, scope: 'own' }, ctx.db, {
    id: ctx.userId,
    version,
    set,
  });
  if (!updated) throw new BizError('user.version_conflict');
  return { before, after: await getOwnProfile(ctx) };
}

export function getDepartmentLeaderReferences(db: DbExec, ids: readonly string[]) {
  return departmentLeaderReferencesRaw(db, ids);
}
export function getDepartmentLeaderOptions(
  db: DbExec,
  input: Parameters<typeof departmentLeaderOptionsRaw>[1],
) {
  return departmentLeaderOptionsRaw(db, input);
}

export function countPostReferences(db: DbExec, postId: string) {
  return countPostReferencesRaw(db, postId);
}

export async function getAuditIdentities(db: DbExec, ids: readonly string[]) {
  const rows = await auditIdentitiesRaw(
    db,
    ids.filter((id) => z.uuid().safeParse(id).success),
  );
  return new Map(rows.map((row) => [row.id, row]));
}

export async function findAuditSubjectIds(db: DbExec, keyword: string) {
  return (await auditSubjectIdsRaw(db, keyword)).map((row) => row.id);
}
