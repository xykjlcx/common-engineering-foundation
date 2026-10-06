import { queryClient } from '@/app/query';
import { resetAuthExpiryLatch } from '@/lib/http/client';

// 会话切换的唯一入口：清空全部 Query/Mutation 缓存。
// 只清 ['auth'] 不够——导航（['nav',*] staleTime Infinity）、users/roles/depts 等缓存也会串号，
// 所以这里整体 clear()，保证换账号后任何业务缓存都不会复用上个账号的数据。
//
// 凭据不在前端（HttpOnly Cookie，ADR-010 决策一）：登录/登出由后端下发或清除 Cookie，
// 本文件因此只管缓存，不再有访问令牌/刷新令牌的写入与代际推进。
//
// 时序纪律（调用方负责）：
// - 登录成功：在 /login 调用（受保护树未挂载，clear 安全），随后 router.invalidate 重新拉新账号数据。
// - 登出 / 401 过期：调用方必须先导航离开 _auth 受保护树、再 await resetSession()；
//   否则 Shell 里挂载中的 useSuspenseQuery 会立刻重新发请求（多余 401 + 错误闪烁）。
export async function resetSession() {
  resetAuthExpiryLatch();
  await clearSessionCache();
}

async function clearSessionCache() {
  // 先 cancel 再 clear：中断在途请求，避免它们 resolve 后把旧账号数据回填进刚清空的缓存。
  await queryClient.cancelQueries();
  queryClient.clear();
}
