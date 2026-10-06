import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { meQuery } from '@/modules/admin/auth/api';
import { navigationQuery } from '@/modules/admin/menus/api';
import { matchPermission } from '@/lib/permission';
import { AuthenticatedShell } from '@/app/AuthenticatedShell';
import { appConfig, isDemoBuild } from '@/config';
import { AuthExpiredError } from '@/lib/http/errors';
import { useInterrupt } from '@/stores/interrupt';

// _auth 是登录后的稳定布局边界：Header/Sidebar/Shell 挂在这里，子路由只替换内容区。
// beforeLoad 确保会话有效 + 预取 me/导航数据 + 页面级权限守卫；component 用 Shell 包裹 Outlet。
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location, matches, preload }) => {
    const redirectSearch = { redirect: location.pathname + location.searchStr };
    // 会话是 HttpOnly Cookie，前端读不到、也不该猜——登录态的唯一判据是 auth.me 能否返回身份。
    // （旧实现先查 localStorage 里的 token，那既是假协议也会在 Cookie 过期后误判为已登录。）
    //
    // 401 分两种处置（板 StateError 第四格：中断用页内通条，整页会丢已填内容）：
    // - 目标页 enter 且非预加载：用户已经切页，允许整页跳登录；稳定父路由切子页仍为 stay。
    // - 原地刷新 / search 变化 / preload：停在原页，由 Shell 顶部通条接管，
    //   保留显示身份但撤去操作资格，不能把刷新失败当作旧权限重新通过。
    const entering = !preload && matches.at(-1)?.cause === 'enter';
    if (entering && useInterrupt.getState().kind === 'sessionExpired')
      redirect({ to: appConfig.routes.login, search: redirectSearch, throw: true });
    let me = context.queryClient.getQueryData(meQuery.queryKey);
    try {
      me = await context.queryClient.fetchQuery(meQuery);
    } catch (error) {
      if (error instanceof AuthExpiredError && (entering || !me)) {
        redirect({ to: appConfig.routes.login, search: redirectSearch, throw: true });
        throw error;
      }
      if (entering || !me) throw error;
      // 原地刷新失败保留表单，但旧身份不得继续提供操作资格。
      return { me: { ...me, permissions: [], availablePermissions: [], systemAdmin: false } };
    }
    // 强制改密会话不能调用菜单等业务 API；在权限判断与 Shell 预取之前离开受保护树。
    if (me.mustChangePassword) redirect({ to: '/change-password', throw: true });
    // 页面级守卫：取目标叶子路由 staticData.permission 校验（只 throw，禁 toast——preload=intent hover 即触发）
    // 403 页按板（StateError 第一格）要说清「缺哪个权限点 + 当前角色」，所以把两者经 search 带过去
    const leaf = matches[matches.length - 1]?.staticData;
    const need = leaf?.permission ?? leaf?.permissionRef;
    // 能力存在性先于账号授权；超管也不能进入尚未实现的业务页面。
    if (!isDemoBuild && leaf?.access !== 'authenticated' && need && !me.availablePermissions.includes(need))
      redirect({ to: appConfig.routes.forbidden, search: { need, roles: meRoleLabel(me) }, throw: true });
    if (leaf?.access !== 'authenticated' && need && !matchPermission(me, need))
      redirect({ to: appConfig.routes.forbidden, search: { need, roles: meRoleLabel(me) }, throw: true });
    // Shell 用 useSuspenseQuery 取导航数据——此处预取进缓存，渲染时同步命中不触发 Suspense（无首屏闪烁）
    await context.queryClient.fetchQuery(navigationQuery);
    return { me }; // 子路由经 context 拿 me（含 permissions）
  },
  component: () => (
    <AuthenticatedShell>
      <Outlet />
    </AuthenticatedShell>
  ),
});

// 后端 auth.me 只回 systemAdmin 布尔位，不回角色名数组（core router 的 output schema 即真相源）。
// 403 页要显示「当前角色」，所以这里把可得的身份信息压成一个标签；等后端补角色切片再换成真名列表。
function meRoleLabel(me: { systemAdmin: boolean }): string {
  return me.systemAdmin ? 'systemAdmin' : '';
}
