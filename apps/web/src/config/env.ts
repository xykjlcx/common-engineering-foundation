import { z } from 'zod';

// env.ts 是业务代码读取 import.meta.env 的唯一入口。
// 其他层只消费解析后的配置对象，避免环境变量散落后失去校验和生产剥离能力。
//
// 本工程读取环境变量的全集（样例与默认值见 apps/web/.env.example）：
//   VITE_APP_ENV / VITE_APP_VERSION / VITE_API_BASE_URL / VITE_DEFAULT_LOCALE /
//   VITE_REQUEST_TIMEOUT_MS / VITE_ENABLE_MOCK / VITE_ENABLE_DEVTOOLS / VITE_ENABLE_VISUAL_DEBUG
//   —— 以上 7 项在下方 parseEnv() 里解析校验，是浏览器侧唯一入口。
//   VITE_CORE_ORIGIN —— 唯一的例外，故意不在这里：它是 dev server 把 /rpc 与 /api 代理到哪个
//   后端源，只由 vite.config.ts 在 Node 侧从 process.env 读，永远不进浏览器包，因此也没有
//   对应的 ParsedEnv 字段。改代理目标改 vite.config.ts，不要往这里加。
const appEnvSchema = z.enum(['local', 'development', 'test', 'staging', 'production', 'demo']);
const localeSchema = z.enum(['zh-CN', 'en-US']);

export type AppEnvName = z.infer<typeof appEnvSchema>;
export type LocaleCode = z.infer<typeof localeSchema>;

export interface ParsedEnv {
  mode: string;
  dev: boolean;
  prod: boolean;
  appEnv: AppEnvName;
  appVersion: string;
  apiBaseUrl: string;
  defaultLocale: LocaleCode;
  requestTimeoutMs: number;
  enableMockOverride: boolean | undefined;
  enableDevtoolsOverride: boolean | undefined;
  enableVisualDebugOverride: boolean | undefined;
}

type RawEnv = Record<string, unknown>;

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
}

// Override 必须区分“没配置”和“显式 true/false”。
// 例如开发态默认启 mock，但 VITE_ENABLE_MOCK=false 要能明确关闭。
function parseBooleanOverride(name: string, value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error(`${name} must be "true" or "false"`);
}

function parsePositiveInteger(name: string, value: unknown, fallback: number): number {
  const raw = value === undefined || value === null || value === '' ? fallback : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

// import.meta.env 的值形态是 string（DEV/PROD 例外，走 parseBoolean）；
// 非字符串一律按未配置处理，避免 String(object) 落成 "[object Object]"。
function parseString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value !== '' ? value : fallback;
}

function parseAppEnv(mode: string, value: unknown): AppEnvName {
  const fallback = mode === 'demo' ? 'demo' : mode === 'production' ? 'production' : 'development';
  const result = appEnvSchema.safeParse(value || fallback);
  if (!result.success) throw new Error('VITE_APP_ENV must be local/development/test/staging/production/demo');
  return result.data;
}

function parseLocale(value: unknown): LocaleCode {
  const result = localeSchema.safeParse(value || 'zh-CN');
  if (!result.success) throw new Error('VITE_DEFAULT_LOCALE must be zh-CN or en-US');
  return result.data;
}

export function parseEnv(input: RawEnv): ParsedEnv {
  const mode = parseString(input.MODE, 'development');

  return {
    mode,
    dev: parseBoolean(input.DEV, mode !== 'production'),
    prod: parseBoolean(input.PROD, mode === 'production'),
    appEnv: parseAppEnv(mode, input.VITE_APP_ENV),
    appVersion: parseString(input.VITE_APP_VERSION, '0.1.0'),
    apiBaseUrl: parseString(input.VITE_API_BASE_URL, ''),
    defaultLocale: parseLocale(input.VITE_DEFAULT_LOCALE),
    requestTimeoutMs: parsePositiveInteger('VITE_REQUEST_TIMEOUT_MS', input.VITE_REQUEST_TIMEOUT_MS, 15000),
    enableMockOverride: parseBooleanOverride('VITE_ENABLE_MOCK', input.VITE_ENABLE_MOCK),
    enableDevtoolsOverride: parseBooleanOverride('VITE_ENABLE_DEVTOOLS', input.VITE_ENABLE_DEVTOOLS),
    enableVisualDebugOverride: parseBooleanOverride(
      'VITE_ENABLE_VISUAL_DEBUG',
      input.VITE_ENABLE_VISUAL_DEBUG,
    ),
  };
}

export const env = parseEnv(import.meta.env);

// 与下方 shouldStartMockWorker 内联表达式同构的纯谓词，仅供单测覆盖门控逻辑。
// ⚠️ shouldStartMockWorker 不能改成调用本函数：那样 Vite 无法把 import.meta.env 静态求值为
// 常量，startMockWorkerIfEnabled 里的 mocks 动态导入就 tree-shake 不掉，MSW/faker 会重回生产包。
// 两处逻辑必须手动保持一致。
export function computeShouldStartMockWorker(source: {
  mode: string;
  dev: boolean;
  enableMock: string | undefined;
}): boolean {
  // 语义：demo 恒开；dev 默认开、可用 VITE_ENABLE_MOCK=false 显式关；生产恒关。
  return source.mode === 'demo' || (source.dev && source.enableMock === 'true');
}

// 入口 mock worker 开关必须保留为 import.meta.env 直连、可静态分析的表达式（理由见上）。
// 生产模式下即便 VITE_ENABLE_MOCK=true 也恒为 false —— 生产构建不允许 mock 接管网络，
// 避免 MSW/faker 被打进生产包（配合 vite.config.ts 的构建期防呆双重兜底）。
export const shouldStartMockWorker =
  import.meta.env.MODE === 'demo' || (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK === 'true');

// 会话替身（demo 构建专用）的门控，同样必须是 import.meta.env 直连、可静态求值的表达式：
// 用 featuresConfig.isDemo（运行时值）会让 Vite 折不掉那句 `await import('../mocks/demo-auth')`，
// 演示口令就以 lazy chunk 形式留在生产包里（实测：dist/assets/demo-auth-*.js 含 admin123）。
// 语义与 featuresConfig.isDemo 对齐，两处必须手动保持一致（同 shouldStartMockWorker 的取舍）。
export const isDemoBuild = import.meta.env.MODE === 'demo';

export async function startMockWorkerIfEnabled(): Promise<boolean> {
  if (!shouldStartMockWorker) return false;

  const { enableMocking } = await import('@/mocks/browser');
  await enableMocking();
  return true;
}
