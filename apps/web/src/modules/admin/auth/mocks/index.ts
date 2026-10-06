import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { genId } from '@/mocks/db';
import { ForgotPasswordSchema, RegisterSchema } from '../api';
import { passwordResetRequests, registeredAccounts } from './db';

export const registrationHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const parsed = RegisterSchema.safeParse(await request.json());
    if (!parsed.success)
      return biz({ status: 400, code: 'auth.registration.invalid', detail: '注册信息不完整' });
    if (registeredAccounts.all().some((account) => account.email === parsed.data.email))
      return biz({ status: 409, code: 'auth.email.conflict', detail: '邮箱已注册' });
    registeredAccounts.insert({
      id: genId('registered-user'),
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    return ok({ email: parsed.data.email });
  }),
  http.post('/api/auth/forgot-password', async ({ request }) => {
    const parsed = ForgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'auth.email.invalid', detail: '邮箱格式不正确' });
    if (!registeredAccounts.all().some((account) => account.email === parsed.data.email))
      return biz({ status: 404, code: 'auth.email.not-found', detail: '邮箱未注册' });
    passwordResetRequests.insert({
      id: genId('password-reset'),
      email: parsed.data.email,
      createdAt: '2026-07-10 16:00:00',
    });
    return ok({ email: parsed.data.email, expiresInMinutes: 30 });
  }),
];

// 会话面（login/me/logout）不在此列：已直连 core 的 /rpc 面，
// 按 M2 裁决①附带条件 4「不为 /rpc 面新造 mock 协议」，mock 只保留尚无后端的注册/找回密码。
export const authHandlers = [...registrationHandlers];

export { passwordResetRequests, registeredAccounts } from './db';
