import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import { Providers } from './providers';
import { RouteError } from './RouteError';
import { queryClient } from './query';
import { authEvents } from '@/lib/http/events';
import { useInterrupt } from '@/stores/interrupt';
import { i18nInit } from '@/lib/i18n';
import { assertMenuPathsValid } from '@/modules/registry';
import { appConfig, featuresConfig } from '@/config';
import '@/styles/global.css';

// mount.tsx 是浏览器端应用装配层：路由、QueryClient、Provider、i18n 和全局事件都在这里接线。
// 页面组件不应自己处理这些基础设施，否则会破坏 Shell 稳定性和请求缓存一致性。
export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // 全局错误兜底：无此项时渲染期错误的 CatchBoundary 退化为 SafeFragment，错误冒泡到 React 根导致白屏（诊断 F2）。
  defaultErrorComponent: RouteError,
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// dev 菜单漂移校验：种子已由 RoutePath 编译期收窄，此处防未来运行时（DB）菜单指向不存在路由。
// 必须在 createRouter 之后跑——fullPath 由路由树初始化时计算，此时 routesByPath 才完整。
if (featuresConfig.isDev) assertMenuPathsValid(Object.keys(router.routesByPath));

// 401 统一处理（事件解耦，spec §9；http 层不感知路由）：
// 请求期过期 → 只置「会话过期」状态，由 Shell 顶部的 InterruptSlot 通条接管（板 StateError 第四格：
// 中断用页内通条不用整页跳转——整页会丢掉用户已填的表单内容），用户点「去登录」才导航 + 清会话；
// 导航期（beforeLoad/loader）的 401 才允许整页跳登录，见 routes/_auth.tsx。
// 退订接 HMR dispose，防开发期 mount 模块反复求值导致订阅堆积。
const offAuthExpired = authEvents.on('expired', () => {
  // 已在登录页时忽略：登出/过期后残留请求可能带空 token 再触发 401
  if (router.state.location.pathname === appConfig.routes.login) return;
  useInterrupt.getState().setSessionExpired();
});
// 断网 / 恢复：同一条通条位，danger →「正在重连」，恢复后 success →「已连接，你填写的内容都还在」
const onOffline = () => useInterrupt.getState().setOffline();
const onOnline = () => useInterrupt.getState().setOnline();
window.addEventListener('offline', onOffline);
window.addEventListener('online', onOnline);
import.meta.hot?.dispose(() => {
  offAuthExpired();
  window.removeEventListener('offline', onOffline);
  window.removeEventListener('online', onOnline);
});

export async function mountApp() {
  await i18nInit; // 与 MSW 启动同级纪律：i18n ready 前不 mount，防首屏 key 闪现
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  );
}
