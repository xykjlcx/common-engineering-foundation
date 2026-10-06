import type { LocaleCode } from '@/lib/i18n-config';

// 语言资源唯一聚合点：lib/i18n.ts 只 import 本文件。
//
// namespace × locale 各自一个动态 import = 各自一个 chunk。静态 import 会把两种语言的全部文案
// 灌进入口包（实测 mount-*.js 同时含中英两份），而绝大多数会话只用得上一种。
// admin 命名空间按业务纵切拆文件（locales/<lang>/admin/<business>.json），
// 加/删业务 = 加/删对应 json + `locales/<lang>/admin/index.ts` 各一行；
// 漏改一侧在 en-US/admin/index.ts 编译期就红，不必等 locale-key-parity 跑。

export const NAMESPACES = ['common', 'admin'] as const;
export type Namespace = (typeof NAMESPACES)[number];

type Loader = () => Promise<{ default: unknown }>;

const loaders: Record<LocaleCode, Record<Namespace, Loader>> = {
  'zh-CN': {
    common: () => import('./zh-CN/common.json'),
    admin: () => import('./zh-CN/admin'),
  },
  'en-US': {
    common: () => import('./en-US/common.json'),
    admin: () => import('./en-US/admin'),
  },
};

export function isSupportedLocale(value: string): value is LocaleCode {
  return value in loaders;
}

export function isKnownNamespace(value: string): value is Namespace {
  return (NAMESPACES as readonly string[]).includes(value);
}

export async function loadNamespace(locale: LocaleCode, namespace: Namespace): Promise<unknown> {
  return (await loaders[locale][namespace]()).default;
}
