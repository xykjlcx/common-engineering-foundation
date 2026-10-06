import i18n, { type BackendModule, type ReadCallback } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/lib/i18n-config';
import { isKnownNamespace, isSupportedLocale, loadNamespace, NAMESPACES } from '@/locales';

// 资源按 namespace × locale 动态加载，各自成 chunk（见 locales/index.ts）。
// 走 i18next 自带的 backend 契约而不是自己在 init 前 await：changeLanguage 会等资源就位后
// 才广播 languageChanged，切语言不会先闪一屏裸 key。
const lazyResources: BackendModule = {
  type: 'backend',
  init: () => {},
  read: (language: string, namespace: string, callback: ReadCallback) => {
    if (!isSupportedLocale(language) || !isKnownNamespace(namespace)) {
      callback(null, {});
      return;
    }
    loadNamespace(language, namespace).then(
      (resource) => callback(null, resource as Parameters<ReadCallback>[1]),
      (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), false),
    );
  },
};

const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

export const i18nInit = i18n
  .use(lazyResources)
  .use(initReactI18next)
  .init({
    lng: stored && isSupportedLocale(stored) ? stored : DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    // 三个 namespace 全量预载当前语言：文案 key 散在 Shell 与各业务页，
    // 按路由细分预载会让未预载的页面先渲染裸 key。chunk 边界已按 ns 切好，
    // 将来要做路由级按需，只需在这里收窄 ns 并给路由声明所需 namespace。
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
