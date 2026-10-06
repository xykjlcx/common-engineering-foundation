import * as z from 'zod';
import { BizError, commonErrorContracts, KERNEL_ERROR_CODES } from '../../../kernel/errors.js';
import { authedProc } from '../../../kernel/procedures.js';
import type { SliceDefinition } from '../../../kernel/slice.js';
import { getAuthUserById } from '../../user/api.js';

const definition = {
  route: { method: 'GET', path: '/auth/me', summary: '当前会话身份（前端权限初始化源）' },
  meta: { perm: 'none', permNoneReason: '回显当前会话主体，会话本身即凭证；出参恒为调用者自己的身份' },
} satisfies SliceDefinition;

const inputSchema = z.object({}).strict();

const outputSchema = z.object({
  userId: z.uuid(),
  username: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  mustChangePassword: z.boolean(),
  systemAdmin: z.boolean(),
  scope: z.enum(['all', 'own']),
  permissions: z.array(z.string()),
  /** 当前部署实际实现的业务权限目录；独立于当前账号授权，不可被超管短路。 */
  availablePermissions: z.array(z.string()),
});

const errors = { ...commonErrorContracts };

export const me = authedProc
  .route(definition.route)
  .meta(definition.meta)
  .input(inputSchema)
  .output(outputSchema)
  .errors(errors)
  .handler(async ({ context: ctx }) => {
    const user = await getAuthUserById(ctx.db, ctx.userId);

    // 主体装配后账号仍可能被删除；统一会话错误以免泄露存在性。
    if (!user) throw new BizError(KERNEL_ERROR_CODES.SESSION_INVALID);
    const result = {
      userId: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
      systemAdmin: user.isSystemAdmin,
      // 身份摘要只保留基础身份档；具体操作范围由服务端按当前权限重新计算。
      scope: ctx.isSuperuser ? ('all' as const) : ('own' as const),
      permissions: [...ctx.permissions].sort(),
      availablePermissions: [...ctx.availablePermissions].sort(),
    };
    return result;
  });
