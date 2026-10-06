import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 组件站私有件：用法示例下方的源码块。刻意不引高亮库——
// 组件站是 dev-only 页，为几段示例背一个 shiki/prism 的体积与主题适配不划算，
// 等宽 + 语义 token 的前景色已经够读（antd 官网的代码块也只是浅底 + 等宽）。
export function CodeBlock({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    // 非安全上下文 / 无权限时 clipboard 会 reject，这里只是不给"已复制"反馈，不弹错
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      data-slot="doc-code-block"
      className={cn('relative rounded-8 border border-border bg-surface-2', className)}
    >
      <Button
        type="button"
        variant="text"
        size="xs"
        onClick={() => void copy()}
        className="absolute end-[calc(6px*var(--app-scale))] top-[calc(6px*var(--app-scale))]"
      >
        {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
        {copied ? '已复制' : '复制'}
      </Button>
      <pre className="overflow-x-auto p-[calc(14px*var(--app-scale))] pe-[calc(76px*var(--app-scale))] font-mono text-[calc(12.5px*var(--app-scale))] leading-[1.75] text-(--type-2-fg)">
        <code>{code}</code>
      </pre>
    </div>
  );
}
