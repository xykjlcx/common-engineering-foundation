import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { InterruptBanner } from '@/components/pro/InterruptBanner';
import { queryClient } from '@/app/query';
import { resetSession } from '@/lib/reset-auth';
import { useInterrupt } from '@/stores/interrupt';
import { appConfig } from '@/config';

// 内容区顶部的中断通条单条插槽（StateError.dc.html 第四格：三种通条共用同一位置，同时只显示一条）。
// 住 Shell 而不住页面：过期/断网横切所有页面，且不能因页面切换而丢失。
// 「已恢复」短暂展示后自撤：板未给时长，借用 FormFeedback 板 Toast 成功态的 3s（同一类「一过性成功反馈」）。
const ONLINE_DISMISS_MS = 3000;

export function InterruptSlot() {
  const { t } = useTranslation();
  const router = useRouter();
  const kind = useInterrupt((s) => s.kind);
  const dismiss = useInterrupt((s) => s.dismiss);

  useEffect(() => {
    if (kind !== 'online') return;
    const timer = setTimeout(dismiss, ONLINE_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [kind, dismiss]);

  if (!kind) return null;

  // 「去登录」是用户主动离开：先导航离开受保护树，再清会话（顺序纪律见 lib/reset-auth.ts）
  const goLogin = () => {
    const redirect = location.pathname + location.search;
    void (async () => {
      await router.navigate({ to: appConfig.routes.login, search: { redirect } });
      await resetSession();
      dismiss();
    })();
  };
  // 断网重试：只重拉当前活跃查询，不重建页面（已填内容都还在）
  const retry = () => {
    void queryClient.refetchQueries({ type: 'active' });
    if (navigator.onLine) useInterrupt.getState().setOnline();
  };

  // 板 StateError.dc.html L68：通条容器 padding 0 20px、gap 10
  return (
    <div
      data-slot="interrupt-slot"
      className="px-[calc(20px*var(--app-scale))] pt-[calc(10px*var(--app-scale))]"
    >
      {kind === 'sessionExpired' && (
        <InterruptBanner
          tone="warning"
          message={t('interrupt.sessionExpired')}
          action={{ label: t('interrupt.goLogin'), onClick: goLogin }}
        />
      )}
      {kind === 'offline' && (
        <InterruptBanner
          tone="danger"
          message={t('interrupt.offline')}
          action={{ label: t('interrupt.retry'), onClick: retry }}
        />
      )}
      {kind === 'online' && (
        <InterruptBanner
          tone="success"
          message={t('interrupt.online')}
          action={{ label: t('interrupt.continue'), onClick: dismiss }}
        />
      )}
    </div>
  );
}
