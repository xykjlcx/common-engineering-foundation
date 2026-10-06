import { Suspense, lazy, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ApiTable } from './ApiTable';
import { CodeBlock } from './CodeBlock';
import type { ApiGenerated, DocEntry, UsageDoc } from '../types';

// 组件站单页骨架：页头 →「示例」（状态矩阵）→「用法」（何时使用 + 可运行示例 + 源码）→「API」（生成的 props 表）。
// demo / usage 都按 types.ts 的文件名约定用 import.meta.glob 解析，注册表里不写 import——
// 这样新增一页只用「加注册表一条 + 建 sections/<key>.tsx」，不用改这里。
// 三个 glob 都可能扫不到文件（迁移期 section 还没建、多数组件没有 usage），一律降级成占位，不炸页。
// section / usage 都懒加载：一是别把十几张状态矩阵塞进同一个 chunk，二是让「某一页的示例文件写坏了」
// 只炸那一页，而不是 eager 求值时把整个组件站带走。API 产物是静态 JSON，必须同步可读，才 eager。
const sectionModules = import.meta.glob('../sections/*.tsx');
const usageModules = import.meta.glob<{ usage?: UsageDoc }>('../usage/*.tsx');
const apiModules = import.meta.glob<{ default: ApiGenerated }>('../api.generated.json', {
  eager: true,
});

const apiGenerated = apiModules['../api.generated.json']?.default;

// 在模块作用域一次性把每个 section 包成 lazy 组件：lazy() 只登记 loader，真正的 import 要等渲染才发，
// 代码分割不受影响；放进 useMemo 反而算「渲染期新建组件类型」（react-hooks/static-components 会红）。
const sectionComponents: Record<string, ComponentType> = Object.fromEntries(
  Object.entries(sectionModules).map(([modulePath, load]) => [
    modulePath.slice('../sections/'.length, -'.tsx'.length),
    lazy(load as () => Promise<{ default: ComponentType }>),
  ]),
);

const SECTION_IDS = { demo: 'doc-demo', usage: 'doc-usage', api: 'doc-api' } as const;

const anchorClassName =
  'rounded-8 px-3 py-[calc(5px*var(--app-scale))] text-[calc(13px*var(--app-scale))] text-(--type-2-fg) hover:bg-(--nav-item-bg-hover)';

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2
      id={id}
      className="scroll-mt-[calc(12px*var(--app-scale))] text-[calc(15px*var(--app-scale))] font-semibold text-text"
    >
      {children}
    </h2>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-8 border border-dashed border-border px-3 py-[calc(10px*var(--app-scale))] text-[calc(13px*var(--app-scale))] text-text-3">
      {children}
    </p>
  );
}

function UsageBlock({ usage }: { usage: UsageDoc }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-[72ch] text-[calc(13px*var(--app-scale))] leading-[1.8] text-(--type-2-fg)">
        {usage.when}
      </div>
      {usage.examples.map((example) => {
        const Demo = example.render;
        return (
          <article key={example.title} className="flex flex-col gap-2">
            <h3 className="text-[calc(14px*var(--app-scale))] font-semibold text-text">{example.title}</h3>
            {example.description && (
              <div className="max-w-[72ch] text-[calc(13px*var(--app-scale))] text-(--type-2-fg)">
                {example.description}
              </div>
            )}
            <div className="rounded-8 border border-border bg-surface p-[calc(16px*var(--app-scale))]">
              <Demo />
            </div>
            <CodeBlock code={example.code} />
          </article>
        );
      })}
      {usage.notes && usage.notes.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 ps-5 text-[calc(13px*var(--app-scale))] text-(--type-2-fg)">
          {usage.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

type UsageState =
  { kind: 'absent' } | { kind: 'loading' } | { kind: 'ready'; usage: UsageDoc } | { kind: 'malformed' };

// usage 当「数据」加载而不是 React.lazy 出一个组件：lazy 里包一层匿名组件等于每次渲染新建组件类型，
// 而 usage 本来就是一份 UsageDoc 数据，交给固定的 UsageBlock 渲染即可。
// 「有没有这个文件」是同步可知的，直接从 key 推导，不进 state——effect 里只留异步结果的那一次 setState。
function useUsageDoc(key: string): UsageState {
  const load = usageModules[`../usage/${key}.tsx`];
  const [loaded, setLoaded] = useState<{ key: string; usage: UsageDoc | null } | null>(null);

  useEffect(() => {
    const loader = usageModules[`../usage/${key}.tsx`];
    if (!loader) return;
    let alive = true;
    void loader().then((mod) => {
      if (alive) setLoaded({ key, usage: mod.usage ?? null });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  if (!load) return { kind: 'absent' };
  // loaded.key 与当前 key 不同 = 上一页的结果还没被换掉，这一页仍在加载
  if (!loaded || loaded.key !== key) return { kind: 'loading' };
  return loaded.usage ? { kind: 'ready', usage: loaded.usage } : { kind: 'malformed' };
}

export function DocPage({ entry, className }: { entry: DocEntry; className?: string }) {
  const Section = sectionComponents[entry.key];
  const usage = useUsageDoc(entry.key);

  return (
    <article
      data-testid="docPage"
      data-doc-key={entry.key}
      className={cn('flex flex-col gap-6 p-[calc(24px*var(--app-scale))]', className)}
    >
      <header className="flex flex-col gap-2">
        <h1 className="ui-page-title text-[calc(22px*var(--app-scale))] font-semibold text-text">
          {entry.title}
        </h1>
        <p className="max-w-[80ch] text-[calc(13.5px*var(--app-scale))] text-(--type-2-fg)">
          {entry.description}
        </p>
        {entry.antd && (
          <p className="max-w-[80ch] text-[calc(13px*var(--app-scale))] text-text-3">{entry.antd}</p>
        )}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[calc(12px*var(--app-scale))] text-text-3">
          {entry.sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
        <nav aria-label="页内锚点" className="mt-1 flex flex-wrap gap-1 border-b border-border pb-2">
          <a href={`#${SECTION_IDS.demo}`} className={anchorClassName}>
            示例
          </a>
          <a href={`#${SECTION_IDS.usage}`} className={anchorClassName}>
            用法
          </a>
          <a href={`#${SECTION_IDS.api}`} className={anchorClassName}>
            API
          </a>
        </nav>
      </header>

      <section data-slot="doc-demo" className="flex flex-col gap-3">
        <SectionHeading id={SECTION_IDS.demo}>示例</SectionHeading>
        {Section ? (
          <Suspense fallback={<Skeleton className="h-[calc(240px*var(--app-scale))] w-full" />}>
            <Section />
          </Suspense>
        ) : (
          <Placeholder>示例待补：还没有 -docs/sections/{entry.key}.tsx</Placeholder>
        )}
      </section>

      <section data-slot="doc-usage" className="flex flex-col gap-3">
        <SectionHeading id={SECTION_IDS.usage}>用法</SectionHeading>
        {usage.kind === 'ready' && <UsageBlock usage={usage.usage} />}
        {usage.kind === 'loading' && <Skeleton className="h-[calc(120px*var(--app-scale))] w-full" />}
        {usage.kind === 'absent' && (
          <Placeholder>该组件暂无「何时使用」文档（只有高频件写 -docs/usage/{entry.key}.tsx）。</Placeholder>
        )}
        {usage.kind === 'malformed' && (
          <Placeholder>usage/{entry.key}.tsx 没有命名导出 usage，这一页的用法读不到。</Placeholder>
        )}
      </section>

      <section data-slot="doc-api" className="flex flex-col gap-4">
        <SectionHeading id={SECTION_IDS.api}>API</SectionHeading>
        {entry.api.length === 0 ? (
          <Placeholder>注册表没有为这一页登记 api 组件名。</Placeholder>
        ) : (
          entry.api.map((name) => (
            <ApiTable
              key={name}
              name={name}
              component={apiGenerated?.components[name]}
              showTitle={entry.api.length > 1}
            />
          ))
        )}
      </section>
    </article>
  );
}
