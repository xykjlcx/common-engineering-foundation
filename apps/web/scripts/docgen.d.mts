// docgen.mjs 的类型声明：守卫 `-docs/api-freshness.test.ts` 要复算同一个 sourceHash，
// 算法必须只有一份实现（散成两份就会在改一边时静默假红），所以让 TS 侧能直接 import 脚本导出。
import type { ApiGenerated } from '../src/routes/_auth/dev/-docs/types';

/** 注册表里所有 DocEntry.sources 的并集，去重排序（相对 apps/web 的路径） */
export function collectSources(): Promise<string[]>;

/** 产物 sourceHash：按排序后的相对路径逐个喂「路径 + 内容」 */
export function computeSourceHash(sources: readonly string[], rootDir?: string): string;

export function generateApiDoc(): Promise<ApiGenerated>;
