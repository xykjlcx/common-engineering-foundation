import { queryOptions } from '@tanstack/react-query';
import { rpc } from '@/lib/rpc/client';
import { isDemoBuild } from '@/config/env';
import { demoAuth } from '../mocks/demo-auth';
import { authKeys } from './keys';
import {
  ChangePasswordInputSchema,
  LoginInputSchema,
  type ChangePasswordInput,
  type LoginInput,
} from './schema';

// 会话面直连后端 oRPC（/rpc）：登录/回显/登出/改密 procedure 的类型全部由 core router 推导，
// 前端不再手写响应 DTO——本文件也因此没有 zod 响应契约（那是 REST 面 http client 的形态）。
//
// 凭据只在 HttpOnly Cookie 里：登录成功后浏览器自动带 Cookie，前端不接触令牌，
// 故没有 setSession / token store / refresh 重放（ADR-010 决策一）。

/**
 * 开发/生产恒为真后端；只有纯前端演示构建（`pnpm build:demo`）换成同类型替身
 * （裁决①附带条件 4）。isDemoBuild 是可静态求值的常量（config/env.ts），
 * 非 demo 构建里这个三元被折成常量、demo-auth 整个模块被 tree-shake 掉——
 * 演示口令不进生产包（实测：dist 无 demo chunk、无 admin123）。
 * ⚠️ 别改成动态 import()：那会给它开一个 chunk 边界，即使分支被折掉，
 * 孤儿 chunk 仍会落进 dist（实测踩过：dist/assets/demo-auth-*.js 带着演示口令）。
 */
const authClient = (): Pick<
  typeof rpc.auth,
  'login' | 'me' | 'logout' | 'changePassword' | 'listSessions' | 'revokeSession'
> => (isDemoBuild ? demoAuth : rpc.auth);

export const authApi = {
  /** 入参仍过一次 zod：表单值到达网络前先在前端拦下明显非法输入（与 RHF 校验同一 schema） */
  login: (dto: LoginInput) => authClient().login(LoginInputSchema.parse(dto)),
  me: (options?: { signal?: AbortSignal }) => authClient().me({}, options),
  logout: () => authClient().logout({}),
  changePassword: (dto: ChangePasswordInput) =>
    authClient().changePassword(ChangePasswordInputSchema.parse(dto)),
  listSessions: (options?: { signal?: AbortSignal }) => authClient().listSessions({}, options),
  revokeSession: (handle: string) => authClient().revokeSession({ handle }),
};

/** 当前会话身份（用户摘要 + 权限码集 + 数据范围）：前端权限初始化的唯一来源 */
export type MeDto = Awaited<ReturnType<typeof authApi.me>>;

export const meQuery = queryOptions({
  queryKey: authKeys.me(),
  queryFn: ({ signal }) => authApi.me({ signal }),
  staleTime: 5 * 60_000,
  // 会话失效不重试：401 已由 rpc client 广播成全局登出，重试只会多打两次死请求
  retry: false,
});
