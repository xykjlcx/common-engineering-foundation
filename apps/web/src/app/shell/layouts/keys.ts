// 布局清单的**运行时登记处**（唯一源）：registry.ts 用 Record<LayoutKey, …> 消费它，
// 少一个多一个都过不了 tsc；外观抽屉与视觉验收脚本（scripts/visual-agent-browser.mjs）也读这里。
// 单独成文件而非放 registry.ts，是因为 registry.ts import 了 .tsx 组件——纯数据文件才能被
// Node 直接读取（视觉脚本不经 Vite）。
export const LAYOUT_KEYS = ['sidebar', 'rail', 'inset', 'pipeline'] as const;

export type LayoutKey = (typeof LAYOUT_KEYS)[number];
