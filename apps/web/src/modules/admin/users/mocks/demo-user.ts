import {
  UserViewSchema,
  UserDetailViewSchema,
  CreateUserSchema,
  UpdateUserSchema,
  ChangeAccountPolicySchema,
  UserLoginLogQuerySchema,
  UserOperationLogQuerySchema,
} from '@keel/core/user-contract';
import type { z } from 'zod';
import type { rpc } from '@/lib/rpc/client';
import { BizError } from '@/lib/http/errors';
import { generateUserPassword, parseFilters } from '../model';
import { matchUserFilters, matchUserKeyword, sortUsers } from './filter-eval';
import { UserSchema } from '../api/schema';

const deptId = '00000000-0000-4000-8000-000000000101';
const roleId = '00000000-0000-4000-8000-000000000201';
export const demoDepartments = () => [{ id: deptId, parentId: null, name: '演示部门' }];
export const demoRoles = () => [
  {
    id: roleId,
    name: '演示角色',
    type: 'custom' as const,
    description: '仅用于演示',
    dataScope: 'self' as const,
    deptIds: [],
    enabled: true,
    version: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];
type View = z.infer<typeof UserViewSchema>;
let demoRecords: Map<string, View> | undefined;
function records(): Map<string, View> {
  if (demoRecords) return demoRecords;
  const { password: _seedPassword, ...seed } = CreateUserSchema.parse({
    username: 'linxiaoyu',
    name: '林小雨',
    password: 'DemoInitial@123',
    deptId,
    roleIds: [roleId],
  });
  demoRecords = new Map<string, View>([
    [
      '00000000-0000-4000-8000-000000000301',
      UserViewSchema.parse({
        postName: null,
        ...seed,
        id: '00000000-0000-4000-8000-000000000301',
        avatarId: null,
        avatar: null,
        systemAdmin: false,
        accountStatus: 'enabled',
        lastLoginAt: null,
        version: 0,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      }),
    ],
  ]);
  return demoRecords;
}
function failure(code: string, status = 409): never {
  throw new BizError({ status, code, traceId: null, instance: null, retryAfter: null });
}
function current(id: string, version?: number) {
  const row = records().get(id);
  if (!row) return failure('user.not_found', 404);
  if (version !== undefined && row.version !== version) return failure('user.version_conflict');
  return row;
}
function changed(row: View) {
  records().set(row.id, row);
  return { ...row, status: row.accountStatus === 'enabled' ? ('active' as const) : ('disabled' as const) };
}
function update(row: View, patch: Partial<View>) {
  return changed({ ...row, ...patch, version: row.version + 1, updatedAt: new Date().toISOString() });
}
export type UserRpcClient = Pick<
  typeof rpc.user,
  | 'deptCounts'
  | 'loginLogs'
  | 'operationLogs'
  | 'list'
  | 'detail'
  | 'create'
  | 'update'
  | 'changeStatus'
  | 'batchStatus'
  | 'assignRoles'
  | 'batchRoles'
  | 'resetPassword'
  | 'batchResetPassword'
  | 'previewMove'
  | 'batchMove'
  | 'batchArchive'
  | 'changeEmployment'
  | 'changeAccountPolicy'
>;
export const demoUser: UserRpcClient = {
  deptCounts: async () => {
    const tally = new Map<string, number>();
    let unassigned = 0;
    for (const row of records().values()) {
      if (row.deptId) tally.set(row.deptId, (tally.get(row.deptId) ?? 0) + 1);
      else unassigned += 1;
    }
    return { counts: [...tally].map(([deptId, count]) => ({ deptId, count })), unassigned };
  },
  loginLogs: async (input) => {
    const { id, page, pageSize } = UserLoginLogQuerySchema.parse(input);
    current(id);
    return { list: [], total: 0, page, pageSize };
  },
  operationLogs: async (input) => {
    const { id, page, pageSize } = UserOperationLogQuerySchema.parse(input);
    current(id);
    return { list: [], total: 0, page, pageSize };
  },
  changeAccountPolicy: async (input) => {
    const { id, version, effectiveAt, mustChangePassword } = ChangeAccountPolicySchema.parse(input);
    const row = current(id, version);
    if (row.systemAdmin) return failure('permission.denied', 403);
    const nextEffectiveAt = effectiveAt === null ? null : new Date(effectiveAt).toISOString();
    const changed = row.effectiveAt !== nextEffectiveAt || row.mustChangePassword !== mustChangePassword;
    const next = changed ? update(row, { effectiveAt: nextEffectiveAt, mustChangePassword }) : row;
    return {
      id,
      version: next.version,
      effectiveAt: next.effectiveAt,
      mustChangePassword: next.mustChangePassword,
      updatedAt: next.updatedAt,
      changed,
    };
  },
  previewMove: async ({ targets, deptId: targetId }) => {
    const rows = targets.map((target) => current(target.id, target.version));
    if (targetId && !demoDepartments().some((node) => node.id === targetId)) failure('dept.not_found', 422);
    return {
      deptId: targetId,
      deptName: targetId ? (demoDepartments()[0]?.name ?? null) : null,
      companyId: null,
      companyName: null,
      companyChangeCount: 0,
      fingerprint: '0'.repeat(64),
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        fromNodeId: row.deptId,
        fromNodeName: row.deptId ? (demoDepartments()[0]?.name ?? null) : null,
        fromCompanyId: null,
        fromCompanyName: null,
      })),
    };
  },
  batchMove: async ({ targets, deptId }) => {
    const rows = targets.map((target) => current(target.id, target.version));
    return { items: rows.map((row) => update(row, { deptId })) };
  },
  batchResetPassword: async ({ targets }) => {
    const rows = targets.map((target) => current(target.id, target.version));
    return {
      items: rows.map((row) => ({
        ...update(row, { mustChangePassword: true }),
        password: generateUserPassword(),
      })),
    };
  },
  batchArchive: async ({ targets }) => {
    const rows = targets.map((target) => current(target.id, target.version));
    for (const row of rows) records().delete(row.id);
    return { items: rows.map((row) => ({ id: row.id, version: row.version + 1 })) };
  },
  changeEmployment: async ({ id, version, action, status }) => {
    const row = current(id, version);
    if (row.employmentStatus === 'left' && status !== 'left' && action !== 'rehire')
      return failure('user.rehire_required');
    return update(row, {
      employmentStatus: status,
      ...(status === 'left' || action === 'rehire' ? { accountStatus: 'disabled' } : {}),
    });
  },
  list: async (input) => {
    const filtered = [...records().values()].filter(
      (row) =>
        matchUserKeyword(UserSchema.parse(row), input.keyword ?? '') &&
        matchUserFilters(
          UserSchema.parse(row),
          parseFilters('filters' in input && typeof input.filters === 'string' ? input.filters : undefined),
          {},
        ),
    );
    const views = sortUsers(
      filtered.map((row) => UserSchema.parse(row)),
      'sort' in input && typeof input.sort === 'string' ? input.sort : undefined,
    );
    return {
      list: views
        .slice(((input.page ?? 1) - 1) * (input.pageSize ?? 20), (input.page ?? 1) * (input.pageSize ?? 20))
        .map((row) => current(row.id)),
      total: filtered.length,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    };
  },
  detail: async ({ id }) => {
    const row = current(id);
    return UserDetailViewSchema.parse({
      ...row,
      managerName: row.managerId ? (records().get(row.managerId)?.name ?? null) : null,
      createdBy: null,
      createdByName: null,
      lastLoginIp: null,
      roleGrants: row.roleIds.map((roleId) => ({
        roleId,
        grantedAt: row.createdAt,
        grantedBy: null,
        grantedByName: null,
      })),
      permissionChanges: [],
      effectivePermissions: [],
      effectivePermissionLabels: [],
      scopeSources: [],
      subsystemKeys: [],
    });
  },
  create: async (input) => {
    const { password: _password, ...profile } = CreateUserSchema.parse(input);
    if ([...records().values()].some((row) => row.username === profile.username))
      return failure('user.username_conflict');
    const now = new Date().toISOString();
    return changed(
      UserViewSchema.parse({
        postName: null,
        ...profile,
        id: crypto.randomUUID(),
        avatarId: null,
        avatar: null,
        systemAdmin: false,
        accountStatus: 'enabled',
        lastLoginAt: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
      }),
    );
  },
  update: async (input) => {
    const { id, version, ...patch } = UpdateUserSchema.parse(input);
    return update(current(id, version), patch);
  },
  changeStatus: async ({ id, version, status }) => ({
    ...update(current(id, version), { accountStatus: status === 'active' ? 'enabled' : 'disabled' }),
    revokedSessions: 0,
  }),
  batchStatus: async ({ targets, status }) => {
    const rows = targets.map((target) => current(target.id, target.version));
    return {
      items: rows.map((row) => ({
        ...update(row, { accountStatus: status === 'active' ? 'enabled' : 'disabled' }),
        revokedSessions: 0,
      })),
    };
  },
  assignRoles: async ({ id, version, roleIds }) => update(current(id, version), { roleIds }),
  batchRoles: async ({ targets, roleIds, mode }) => {
    const rows = targets.map((target) => current(target.id, target.version));
    return {
      items: rows.map((row) =>
        update(row, {
          roleIds:
            mode === 'clear'
              ? []
              : mode === 'replace'
                ? roleIds
                : mode === 'add'
                  ? [...new Set([...row.roleIds, ...roleIds])]
                  : row.roleIds.filter((id) => !roleIds.includes(id)),
        }),
      ),
    };
  },
  resetPassword: async ({ id, version }) => ({
    ...update(current(id, version), { mustChangePassword: true }),
    revokedSessions: 0,
  }),
};
