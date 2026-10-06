import { assertPasswordPolicy } from '../../settings/api.js';
import type { TxCtx } from '../../../kernel/context.js';
import { BizError, PermissionError, ValidationError } from '../../../kernel/errors.js';
import { assertNoPrivilegeEscalation } from '../../../kernel/escalation.js';
import { assertPermission } from '../../../kernel/middleware.js';
import { assertAvatarAvailable } from '../../file/api.js';
import { assertRolesExist, getPermCodesOfRoles } from '../../role/api.js';
import * as z from 'zod';
import { postByName } from '../../post/api.js';
import { CreateUserSchema } from '../contract.js';
import type { UserImportIssue } from '../import-contract.js';
import { assertUserCreateScope, emailTaken, employeeNoTaken, usernameTaken } from '../scoped.js';
import { assertAssignmentTargetScope, assertGrantScopeAllowed } from './user-grants.js';
import { assertProfileReferences } from './user-profile.js';
import { USER_PERMS } from '../permissions.js';

/** 只读预检；逐项收集问题，不创建账号、不散列密码、不用写后回滚模拟预检。 */
export async function previewNewUsers(ctx: TxCtx, rawRows: readonly unknown[]) {
  const resolved = await resolveImportPosts(ctx, rawRows);
  const parsed = resolved.map((row) => CreateUserSchema.safeParse(row.input));
  const rows = parsed.map((result, index) => ({
    row: index + 1,
    issues: [
      ...(resolved[index]?.issues ?? []),
      ...(result.success
        ? []
        : result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            code: `validation.${issue.code}`,
          }))),
    ],
  }));
  const duplicates = new Map<string, number[]>();
  for (const [index, result] of parsed.entries()) {
    if (!result.success) continue;
    for (const field of ['username', 'email', 'employeeNo', 'avatarId'] as const) {
      const value = result.data[field];
      if (value) {
        const key = `${field}:${value}`;
        duplicates.set(key, [...(duplicates.get(key) ?? []), index]);
      }
    }
  }
  for (const [key, indices] of duplicates) {
    if (indices.length > 1)
      for (const index of indices)
        rows[index]?.issues.push({
          field: key.slice(0, key.indexOf(':')),
          code: 'user.import_duplicate',
        });
  }
  for (const [index, result] of parsed.entries()) {
    const output = rows[index];
    if (!result.success || !output) continue;
    const input = result.data;
    const check = async (field: string, action: () => void | Promise<void>) => {
      try {
        await action();
      } catch (error) {
        if (error instanceof BizError || error instanceof PermissionError || error instanceof ValidationError)
          output.issues.push({ field, code: error.code });
        else throw error;
      }
    };
    await check('password', () => assertPasswordPolicy(ctx.db, input.password));
    await check('deptId', () => assertUserCreateScope(ctx, input.deptId));
    await check('username', async () => {
      if (await usernameTaken(ctx.db, input.username)) throw new BizError('user.username_conflict');
    });
    await check('email', async () => {
      if (input.email && (await emailTaken(ctx.db, input.email))) throw new BizError('user.email_conflict');
    });
    await check('employeeNo', async () => {
      if (input.employeeNo && (await employeeNoTaken(ctx.db, input.employeeNo)))
        throw new BizError('user.employee_no_conflict');
    });
    await check('deptId', () => assertProfileReferences(ctx, { deptId: input.deptId }));
    await check('postName', () => assertProfileReferences(ctx, { postId: input.postId }));
    await check('managerId', () => assertProfileReferences(ctx, { managerId: input.managerId }));
    await check('roleIds', async () => {
      if (input.roleIds.length === 0) return;
      assertPermission(USER_PERMS.assignRoles, ctx.permissions);
      await assertRolesExist(ctx.db, input.roleIds);
      assertNoPrivilegeEscalation(
        ctx.isSuperuser ? { kind: 'all' } : { kind: 'set', codes: ctx.permissions },
        await getPermCodesOfRoles(ctx.db, input.roleIds),
      );
      const target = { id: ctx.idgen(), deptId: input.deptId };
      await assertAssignmentTargetScope(ctx, target);
      await assertGrantScopeAllowed(ctx, input.roleIds, target);
    });
    await check('avatarId', () => assertAvatarAvailable(ctx, input.avatarId));
  }
  return {
    valid: rows.every((row) => row.issues.length === 0),
    rows,
    inputs: resolved.map((row) => row.input),
  };
}

export function importValidationError(rows: { row: number; issues: UserImportIssue[] }[]): ValidationError {
  return new ValidationError('user.import_invalid', { rows });
}

async function resolveImportPosts(ctx: TxCtx, rows: readonly unknown[]) {
  return Promise.all(
    rows.map(async (raw) => {
      const parsed = z
        .object({ postName: z.string().trim().max(128).nullish() })
        .passthrough()
        .safeParse(raw);
      if (!parsed.success)
        return {
          input: raw,
          issues: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            code: `validation.${issue.code}`,
          })),
        };
      const { postName, ...input } = parsed.data;
      if (!postName) return { input, issues: [] };
      try {
        const post = await postByName(ctx.db, postName);
        return { input: { ...input, postId: post.id }, issues: [] };
      } catch (error) {
        if (!(error instanceof BizError)) throw error;
        return { input, issues: [{ field: 'postName', code: error.code }] };
      }
    }),
  );
}
