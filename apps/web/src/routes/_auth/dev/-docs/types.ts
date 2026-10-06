import type { ComponentType, ReactNode } from 'react';

/** 左导航分组（antd 概览的分法，去掉我们不做的「其他」） */
export type DocGroup = 'general' | 'layout' | 'navigation' | 'entry' | 'display' | 'feedback' | 'pro';

export const DOC_GROUP_ORDER: readonly DocGroup[] = [
  'general',
  'layout',
  'navigation',
  'entry',
  'display',
  'feedback',
  'pro',
];

/** 注册表一条 = 组件站一页。demo 与 usage 不写在这里，按文件名约定用 import.meta.glob 解析：
 *  demo  → `./sections/<key>.tsx`  默认导出 React 组件（状态矩阵；顶层 `data-testid="<camelKey>Matrix"`）
 *  usage → `./usage/<key>.tsx`     命名导出 `usage: UsageDoc`（可选，没有就只显示 demo + API）
 *  api   → `./api.generated.json`  由 `pnpm docs:api` 从 TS 类型生成，key = 组件 displayName */
export interface DocEntry {
  /** URL 段与文件名，kebab-case */
  key: string;
  group: DocGroup;
  /** 导航与页头显示名（中文 + 英文名，如「按钮 Button」） */
  title: string;
  /** 页头一句话 */
  description: string;
  /** 本页 API 表要列出的组件 displayName（与 api.generated.json 的 key 对应），按显示顺序 */
  api: readonly string[];
  /** 源码相对 apps/web 的路径，页头「源码」链接与 docgen 输入共用 */
  sources: readonly string[];
  /** 与 antd 对照的备注，如「对标 antd DatePicker；不做三列滚轮」 */
  antd?: string;
}

export interface UsageExample {
  title: string;
  description?: ReactNode;
  /** 展示用的 TSX 源码字符串（原样显示，不高亮） */
  code: string;
  /** 可运行的 demo */
  render: ComponentType;
}

export interface UsageDoc {
  /** 「何时使用」一段 */
  when: ReactNode;
  examples: readonly UsageExample[];
  /** 「注意事项 / 与 antd 的差异」可选 */
  notes?: readonly ReactNode[];
}

export interface ApiProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue: string | null;
  description: string;
}

export interface ApiComponent {
  displayName: string;
  description: string;
  source: string;
  props: ApiProp[];
}

export interface ApiGenerated {
  /** 所有 sources 文件内容的 sha256（守卫据此判断是否过期） */
  sourceHash: string;
  generatedAt: string;
  components: Record<string, ApiComponent>;
}
