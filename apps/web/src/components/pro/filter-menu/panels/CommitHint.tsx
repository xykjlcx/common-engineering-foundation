import type { JSX } from 'react';

/** 面板底部「关闭面板即生效」提示（D3） */
export function CommitHint({ text }: { text: string }): JSX.Element {
  return (
    <p
      data-slot="filter-value-commit-hint"
      className="px-[calc(12px*var(--app-scale))] py-[calc(8px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--text-3)"
    >
      {text}
    </p>
  );
}
