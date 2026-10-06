import * as z from 'zod';
import type { Ctx, TxCtx } from '../../../kernel/context.js';
import { BizError } from '../../../kernel/errors.js';
import { bindAvatar } from '../../file/api.js';
import { CreateUserSchema } from '../contract.js';
import { UserStatusSchema } from '../schema.js';
import {
  emailTaken,
  employeeNoTaken,
  insertUserScoped,
  isEmailUniqueViolation,
  isEmployeeNoUniqueViolation,
  isUsernameUniqueViolation,
  usernameTaken,
} from '../scoped.js';
import { replaceUserRoles } from './user-grants.js';
import { assertProfileReferences } from './user-profile.js';

export type NewUserInput = z.infer<typeof CreateUserSchema>;

export async function assertUniqueNewUser(ctx: Pick<Ctx, 'db'>, input: NewUserInput): Promise<void> {
  if (await usernameTaken(ctx.db, input.username))
    throw new BizError('user.username_conflict', { username: input.username });
  if (input.email && (await emailTaken(ctx.db, input.email)))
    throw new BizError('user.email_conflict', { email: input.email });
  if (input.employeeNo && (await employeeNoTaken(ctx.db, input.employeeNo)))
    throw new BizError('user.employee_no_conflict', {
      employeeNo: input.employeeNo,
    });
}

/** 单账号创建事务能力：单条与导入共同调用，调用者拥有提交边界。 */
export async function createUserInTransaction(ctx: TxCtx, input: NewUserInput, passwordHash: string) {
  await assertProfileReferences(ctx, input);
  const { password: _password, roleIds: _roleIds, effectiveAt, ...profile } = input;
  const [created] = await insertUserScoped(ctx, ctx.db, {
    ...profile,
    effectiveAt: effectiveAt === null ? null : new Date(effectiveAt),
    passwordHash,
  }).catch((error: unknown) => {
    if (isUsernameUniqueViolation(error))
      throw new BizError('user.username_conflict', {
        username: input.username,
      });
    if (isEmailUniqueViolation(error)) throw new BizError('user.email_conflict', { email: input.email });
    if (isEmployeeNoUniqueViolation(error))
      throw new BizError('user.employee_no_conflict', {
        employeeNo: input.employeeNo,
      });
    throw error;
  });
  if (!created) throw new Error('user insert returned no row');
  await bindAvatar(ctx, input.avatarId, created.id);
  const roleIds = input.roleIds.length
    ? (await replaceUserRoles(ctx, created.id, input.roleIds)).roleIds
    : [];
  return {
    value: {
      id: created.id,
      username: created.username,
      name: created.name,
      email: created.email,
      phone: created.phone,
      status: UserStatusSchema.parse(created.status),
      version: created.version,
      createdAt: created.createdAt.toISOString(),
    },
    audit: {
      objectType: 'user',
      objectId: created.id,
      before: null,
      after: {
        ...profile,
        effectiveAt: input.effectiveAt,
        username: created.username,
        name: created.name,
        email: created.email,
        phone: created.phone,
        status: created.status,
        roleIds,
      },
    },
  };
}
