import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import i18next from 'i18next';
import { AuthExpiredError, BizError, HttpError } from '@/lib/http/errors';
import { bindLocaleGetter } from '@/lib/http/client';

bindLocaleGetter(() => i18next.resolvedLanguage ?? i18next.language ?? 'zh-CN');

// QueryClient 是服务端状态的统一策略点。
// 页面只声明 queryKey/queryFn，不在各页面重复写 retry、refetch 等全局规则。
export const queryClient = new QueryClient({
  // 首次加载失败交给路由 errorComponent 展示；这里只提示「已有数据的后台刷新失败」，
  // 避免与 errorComponent 重复报错，也让原本静默的 revalidate 失败对用户可见（诊断 F2）。
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof AuthExpiredError) return; // 401 由 authEvents 统一处理
      if (query.state.data === undefined) return; // 首次加载失败 → 交给 errorComponent
      toast.error(i18next.t('errors.refetchFailed'));
    },
  }),
  // 全局兜底：所有 mutation 失败都给用户反馈，不再静默。
  // 调用方仍可用 mutateAsync 的 rejection 决定是否关闭弹窗（onError 只做 toast，不吞异常）。
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // 抑制必须显式声明 meta.silent —— 用「有没有 onError」推断会把只做失效/埋点、
      // 根本没给用户反馈的 onError 也误判成已处理，失败就静默消失。
      if (mutation.meta?.silent) return;
      if (error instanceof AuthExpiredError) return; // 401 走全局登出流程，不重复提示
      if (error instanceof BizError) {
        const fallback = error.message !== error.code ? error.message : i18next.t('errors.businessFailed');
        toast.error(i18next.t(`errors.business.${error.code}`, { defaultValue: fallback }));
        return;
      }
      toast.error(i18next.t(error instanceof HttpError ? 'errors.outcomeUnknown' : 'errors.mutationFailed'));
    },
  }),
  defaultOptions: {
    queries: {
      // 传输层已按 HTTP 语义限定 GET/HEAD 重试；Query 层不再叠加一轮无差别重试。
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // 写请求不自动重放；oRPC 超时可能已提交，交由用例回读确认。
      retry: false,
    },
  },
});

// 声明 mutation meta 形状：silent 是「本调用点自己给了失败反馈（toast / setError），
// 全局不要再兜一层」的唯一开关。
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { silent?: true };
  }
}
