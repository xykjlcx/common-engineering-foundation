import type { Ctx, DbExec, TxCtx, TxExec } from '../../../kernel/context.js';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '../../../kernel/crypto.js';
import { BizError } from '../../../kernel/errors.js';
import { revokeByUser } from '../../../kernel/session.js';
import { UserStatusSchema, type UserStatus } from '../schema.js';
import { findByIdRaw, findByUsernameRaw, resetUserPasswordScoped } from '../scoped.js';

export interface AuthUserView {
  id: string;
  username: string;
  name: string;
  email: string | null;
  status: UserStatus;
  isSystemAdmin: boolean;
  mustChangePassword: boolean;
  effectiveAt: Date | null;
  deptId: string | null;
}

interface UserRow {
  id: string;
  username: string;
  name: string;
  email: string | null;
  status: string;
  passwordHash: string;
  isSystemAdmin: boolean;
  mustChangePassword: boolean;
  effectiveAt: Date | null;
  deptId: string | null;
}

function toAuthView(row: UserRow): AuthUserView {
  const { passwordHash: _omit, ...view } = row;
  return { ...view, status: UserStatusSchema.parse(row.status) };
}

/** 验证凭据：用户不存在与密码错误统一返回 null（防枚举）；不存在时仍走恒时假哈希校验 */
export async function verifyCredentials(
  db: TxExec,
  username: string,
  password: string,
): Promise<AuthUserView | null> {
  // 持有凭据行锁直到登录签发提交；改密事务更新同一行后才吊销会话。
  const [row] = await findByUsernameRaw(db, username).for('update');
  if (!row) {
    await verifyPassword(DUMMY_PASSWORD_HASH, password);
    return null;
  }
  return (await verifyPassword(row.passwordHash, password)) ? toAuthView(row) : null;
}

export async function getAuthUserById(db: DbExec, id: string): Promise<AuthUserView | null> {
  const [row] = await findByIdRaw(db, id);
  return row ? toAuthView(row) : null;
}

/** 自助改密：旧凭据核对后仍以版本匹配更新，避免与管理员重置相互覆盖。 */
export async function verifyCurrentPassword(ctx: Pick<Ctx, 'db' | 'userId'>, password: string) {
  const [row] = await findByIdRaw(ctx.db, ctx.userId);
  if (!row || !(await verifyPassword(row.passwordHash, password)))
    throw new BizError('auth.current_password_invalid');
  return { version: row.version, passwordHash: row.passwordHash };
}

export async function changeOwnPassword(ctx: TxCtx, version: number, passwordHash: string): Promise<number> {
  const result = await rotatePasswordInTransaction(
    { ...ctx, scope: 'own' },
    {
      id: ctx.userId,
      version,
      passwordHash,
      mustChangePassword: false,
    },
  );
  if (!result) throw new BizError('user.version_conflict', { id: ctx.userId });
  return result.revokedSessions;
}

/** 凭据写入与旧会话吊销不可拆开，提交边界仍由调用用例持有。 */
export async function rotatePasswordInTransaction(
  ctx: TxCtx,
  input: Parameters<typeof resetUserPasswordScoped>[2],
) {
  const [updated] = await resetUserPasswordScoped(ctx, ctx.db, input);
  if (!updated) return undefined;
  const revokedSessions = await revokeByUser(ctx.db, ctx.clock, updated.id);
  return { updated, revokedSessions };
}
