import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import * as z from 'zod';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { auditLogs } from '../../../schema/index.js';
import { getLastSuccessfulLogin } from '../../auth/api.js';
import { getGrantMenuCatalog } from '../../menu/api.js';
import { getRoleAccessSummary } from '../../role/api.js';
import { UserDetailViewSchema } from '../contract.js';
import {
  USER_AUDIT_ACTIONS,
  USER_CREATION_AUDIT_ACTIONS,
  USER_ROLE_ASSIGNMENT_AUDIT_ACTIONS,
} from '../domain/user-audit-actions.js';
import { getAuditIdentities } from '../domain/user-access.js';
import { userView } from '../domain/user-view.js';
import { appUsers } from '../schema.js';
import { roleGrantsOfUserRaw, visibleUsers } from '../scoped.js';
import { BizError, commonErrorContracts, pick } from '../../../kernel/errors.js';
import { userErrors } from '../errors.js';
import { USER_PERMS } from '../permissions.js';

const definition = {
  route: { method: 'GET', path: '/users/{id}', summary: '用户详情' },
  meta: { perm: USER_PERMS.view },
} satisfies SliceDefinition;

const inputSchema = z.object({ id: z.uuid() }).strict();

const outputSchema = UserDetailViewSchema;

const errors = {
  ...commonErrorContracts,
  ...pick(userErrors, ['user.not_found']),
};
type AuditEvent = typeof auditLogs.$inferSelect;
const roleAssignmentActions = new Set<string>(USER_ROLE_ASSIGNMENT_AUDIT_ACTIONS);

function roleIdsOf(snapshot: unknown): string[] | null {
  if (typeof snapshot !== 'object' || snapshot === null || !('roleIds' in snapshot)) return null;
  const ids = snapshot.roleIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => z.uuid().safeParse(id).success) : null;
}

function permissionChangesFrom(events: readonly AuditEvent[]) {
  const changes = [];
  // 输入已经按时间倒序；仅展示成功的角色变更，最多保留最近 5 条。
  for (const event of events) {
    if (event.outcome !== 'success') continue;
    const after = roleIdsOf(event.after);
    const roleAssignment = roleAssignmentActions.has(event.action);
    const profileRoleUpdate = event.action === USER_AUDIT_ACTIONS.update && after !== null;
    if (!roleAssignment && !profileRoleUpdate) continue;
    const before = new Set(roleIdsOf(event.before) ?? []);
    const next = new Set(after ?? []);
    changes.push({
      at: event.createdAt.toISOString(),
      action: event.action,
      operator: event.actorUserId,
      addedRoleIds: [...next].filter((id) => !before.has(id)),
      removedRoleIds: [...before].filter((id) => !next.has(id)),
    });
    if (changes.length === 5) break;
  }
  return changes;
}

type MenuCatalog = Awaited<ReturnType<typeof getGrantMenuCatalog>>;

/** 权限码 → 名称与所属页面（最近的 menu 祖先）；超管（null）与目录里找不到的码不返回。 */
function describePermissions(catalog: MenuCatalog, codes: readonly string[] | null) {
  if (!codes) return [];
  const byId = new Map(catalog.map((node) => [node.id, node]));
  const byCode = new Map(catalog.flatMap((node) => (node.permCode ? [[node.permCode, node] as const] : [])));
  return codes.flatMap((code) => {
    const node = byCode.get(code);
    if (!node) return [];
    let page: MenuCatalog[number] | undefined = node.type === 'menu' ? node : undefined;
    for (let parent = node.parentId ? byId.get(node.parentId) : undefined; !page && parent;) {
      if (parent.type === 'menu') page = parent;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return [{ code, type: node.type, label: node.label, page: page ? page.label : null }];
  });
}

export const getUserDetail = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx, input }) => {
    const [user] = await visibleUsers(ctx, { where: eq(appUsers.id, input.id) }).limit(1);

    // scope 外的目标与"不存在"同码同状态：403/404 的差异本身就是一条存在性探测通道
    if (!user) throw new BizError('user.not_found', { id: input.id });

    // 授权关系可见性由所属用户决定，须先校验用户范围。
    const grants = await roleGrantsOfUserRaw(ctx.db, user.id);
    const roleIds = grants.map((grant) => grant.roleId);

    // 用户范围校验通过后，并行读取互不依赖的详情事实。
    const [changes, manager, access, lastLogin, creations, catalog] = await Promise.all([
      ctx.db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.objectType, 'user'), eq(auditLogs.objectId, user.id)))
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(50),
      user.managerId ? visibleUsers(ctx, { where: eq(appUsers.id, user.managerId) }).limit(1) : [],
      getRoleAccessSummary(ctx.db, roleIds),
      getLastSuccessfulLogin(ctx.db, user.id),
      ctx.db
        .select({ actorUserId: auditLogs.actorUserId })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.objectType, 'user'),
            eq(auditLogs.objectId, user.id),
            inArray(auditLogs.action, [...USER_CREATION_AUDIT_ACTIONS]),
            eq(auditLogs.outcome, 'success'),
          ),
        )
        .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id))
        .limit(1),
      getGrantMenuCatalog(ctx.db),
    ]);

    const createdBy = creations[0]?.actorUserId ?? null;
    const permissionChanges = permissionChangesFrom(changes);
    const identityIds = [
      createdBy,
      ...grants.map((grant) => grant.grantedBy),
      ...permissionChanges.map((change) => change.operator),
    ].filter((id): id is string => id !== null);
    const identities = await getAuditIdentities(ctx.db, identityIds);

    const basicView = userView(user, roleIds, lastLogin?.at ?? null);

    const roleGrants = grants.map((grant) => ({
      roleId: grant.roleId,
      grantedBy: grant.grantedBy,
      grantedByName: grant.grantedBy ? (identities.get(grant.grantedBy)?.name ?? null) : null,
      grantedAt: grant.grantedAt.toISOString(),
    }));

    // 超级管理员的权限集合用 null 表示，不展开为普通授权清单。
    const effectivePermissions = user.isSystemAdmin ? null : access.effectivePermissions;

    const detail = {
      ...basicView,
      ...access,
      effectivePermissions,
      managerName: manager[0]?.name ?? null,
      createdBy,
      createdByName: createdBy ? (identities.get(createdBy)?.name ?? null) : null,
      lastLoginIp: lastLogin?.ip ?? null,
      roleGrants,
      effectivePermissionLabels: describePermissions(catalog, effectivePermissions),
      permissionChanges: permissionChanges.map((change) => ({
        ...change,
        operatorName: change.operator ? (identities.get(change.operator)?.name ?? null) : null,
      })),
    };
    const result = outputSchema.parse(detail);
    return result;
  });
