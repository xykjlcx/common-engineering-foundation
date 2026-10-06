import type { rpc } from '@/lib/rpc/client';
import { failAuthExpired } from '@/lib/http/client';
import { BizError } from '@/lib/http/errors';

// 纯前端演示态（`pnpm build:demo`）的会话替身。**只在 demo 构建里启用**，
// 生产链路走真后端（见 api/session.ts 的 authClient）。
//
// 形态依据：M2 裁决①附带条件 4——"不为 /rpc 面新造 mock 协议；纯前端 mock 用同类型、无 HTTP 的替身"。
// 裁决点名的 `createRouterClient(mockRouter)` 需要 @orpc/server 运行时依赖（web 只许依赖 @orpc/client
// 且不得新增依赖），故这里手写同类型替身：`Pick<typeof rpc.auth, 'login' | 'me' | 'logout' | 'changePassword'>` 把它钉死在 core router 的真实契约上——
// 后端契约一改，这个文件立刻编译红，不会悄悄漂移成第二套协议。
//
// 与被删除的旧 mock 的区别：不签发任何令牌、不模拟认证头与刷新链，只在浏览器里记一个布尔位。

const DEMO_USERNAME = 'admin';
const DEMO_PASSWORD = 'admin123';
const DEMO_SESSION_KEY = 'demo-session';
// demo 口令只在本次页面运行内变化，不写入浏览器持久化存储。
let demoPassword = DEMO_PASSWORD;

const demoIdentity = {
  userId: '00000000-0000-4000-8000-000000000001',
  username: DEMO_USERNAME,
  name: '演示管理员',
  email: 'demo@example.com',
  mustChangePassword: false,
  systemAdmin: true,
  scope: 'all' as const,
  permissions: [],
  availablePermissions: [],
};

function sessionAlive(): boolean {
  try {
    return localStorage.getItem(DEMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function setSessionAlive(alive: boolean): void {
  try {
    if (alive) localStorage.setItem(DEMO_SESSION_KEY, '1');
    else localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // 隐私模式/配额满：退化为单次会话（刷新即需重新登录），不影响演示主流程
  }
}

/** 与后端一致的错误形状：前端错误分支（401 提示、全局登出）在 demo 下也走同一套 */
function bizError(status: number, code: string): BizError {
  return new BizError({
    status,
    code,
    detail: null,
    title: null,
    params: {},
    traceId: null,
    instance: null,
    retryAfter: null,
  });
}

const DEMO_SESSION_HANDLE = '00000000-0000-4000-8000-0000000000aa';
function demoSession() {
  return {
    handle: DEMO_SESSION_HANDLE,
    current: true,
    ip: '127.0.0.1',
    ua: 'demo',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

export const demoAuth: Pick<
  typeof rpc.auth,
  'login' | 'me' | 'logout' | 'changePassword' | 'listSessions' | 'revokeSession'
> = {
  login: (input) => {
    if (input.username !== DEMO_USERNAME || input.password !== demoPassword) {
      return Promise.reject(bizError(401, 'auth.credentials_invalid'));
    }
    setSessionAlive(true);
    return Promise.resolve({
      userId: demoIdentity.userId,
      username: demoIdentity.username,
      name: demoIdentity.name,
    });
  },
  // 会话失效必须与真 client 走同一出口：`lib/rpc/client.ts` 对 session.invalid 调 failAuthExpired，
  // 它做两件替身自己模拟不了的事——① 抛 AuthExpiredError（routes/_auth.tsx 的守卫按这个**类型**分流：
  // 只有它才当"未登录"跳登录页，其余错误冒泡给 RouteError）；② 广播 authEvents 'expired'，
  // 那是页内中断通条的唯一触发源（mount.tsx 订阅 → stores/interrupt → Shell InterruptSlot）。
  // 直接 reject 一个 BizError 会让 demo 构建下的会话失效既进不了登录页、也弹不出通条。
  // 闩的复位由 resetSession() 负责（登录页挂载与登录成功后都会调）。
  me: () =>
    sessionAlive()
      ? Promise.resolve(demoIdentity)
      : Promise.reject(failAuthExpired(bizError(401, 'session.invalid'))),
  changePassword: (input) => {
    if (!sessionAlive()) return Promise.reject(failAuthExpired(bizError(401, 'session.invalid')));
    if (input.currentPassword !== demoPassword)
      return Promise.reject(bizError(400, 'auth.current_password_invalid'));
    if (input.newPassword.length < 8 || input.newPassword.length > 128)
      return Promise.reject(bizError(400, 'validation.failed'));
    if (input.newPassword === demoPassword) return Promise.reject(bizError(400, 'auth.password_unchanged'));
    demoPassword = input.newPassword;
    setSessionAlive(false);
    return Promise.resolve({ changed: true as const, revokedSessions: 1 });
  },
  logout: () => {
    setSessionAlive(false);
    return Promise.resolve({ ok: true as const });
  },
  listSessions: () =>
    sessionAlive()
      ? Promise.resolve({ sessions: [demoSession()] })
      : Promise.reject(failAuthExpired(bizError(401, 'session.invalid'))),
  revokeSession: ({ handle }) => {
    if (!sessionAlive()) return Promise.reject(failAuthExpired(bizError(401, 'session.invalid')));
    if (handle === DEMO_SESSION_HANDLE) {
      setSessionAlive(false);
      return Promise.resolve({ current: true });
    }
    return Promise.reject(bizError(404, 'auth.session.not_found'));
  },
};
