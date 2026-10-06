import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { SearchField } from '@/components/pro/SearchField';
import { cn } from '@/lib/utils';
import { DOC_GROUP_ORDER, type DocEntry, type DocGroup } from '../types';

// 组件站私有件：左侧组件导航。分组顺序与组名都跟 types.ts 的 DOC_GROUP_ORDER 走，
// 当前项高亮复用 Shell 侧栏那套 --nav-item-* token（组件站不发明第二套导航态配色）。
const GROUP_LABELS: Record<DocGroup, string> = {
  general: '通用',
  layout: '布局',
  navigation: '导航',
  entry: '数据录入',
  display: '数据展示',
  feedback: '反馈',
  pro: 'Pro 复合件',
};

export interface DocNavProps {
  entries: readonly DocEntry[];
  activeKey?: string;
  className?: string;
}

export function DocNav({ entries, activeKey, className }: DocNavProps) {
  const [keyword, setKeyword] = useState('');

  const groups = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    const matched = needle
      ? entries.filter(
          (entry) => entry.key.toLowerCase().includes(needle) || entry.title.toLowerCase().includes(needle),
        )
      : entries;
    return DOC_GROUP_ORDER.map((group) => ({
      group,
      items: matched.filter((entry) => entry.group === group),
    })).filter((bucket) => bucket.items.length > 0);
  }, [entries, keyword]);

  return (
    <nav
      data-testid="docNav"
      aria-label="组件导航"
      className={cn(
        'flex w-[calc(220px*var(--app-scale))] shrink-0 flex-col border-e border-border bg-chrome',
        className,
      )}
    >
      <div className="shrink-0 p-[calc(10px*var(--app-scale))]">
        <SearchField
          aria-label="搜索组件"
          placeholder="搜索组件"
          value={keyword}
          onChange={(event) => setKeyword(event.currentTarget.value)}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(16px*var(--app-scale))]">
        {groups.length === 0 ? (
          <p className="px-[calc(14px*var(--app-scale))] py-2 text-[calc(13px*var(--app-scale))] text-text-3">
            没有匹配的组件
          </p>
        ) : (
          groups.map(({ group, items }) => (
            <div key={group} className="mb-[calc(6px*var(--app-scale))]">
              <p className="px-[calc(14px*var(--app-scale))] py-[calc(6px*var(--app-scale))] text-[calc(12px*var(--app-scale))] font-semibold text-text-3">
                {GROUP_LABELS[group]}
              </p>
              {items.map((entry) => (
                <Link
                  key={entry.key}
                  to="/dev/components/$key"
                  params={{ key: entry.key }}
                  className={cn(
                    'mx-2 my-px flex h-[var(--nav-subitem-h)] items-center rounded-8 px-3 text-[calc(13px*var(--app-scale))]',
                    entry.key === activeKey
                      ? 'border border-(--nav-item-border-current) bg-(--nav-item-bg-current) font-semibold text-(--nav-item-fg-current) shadow-(--nav-item-shadow-current)'
                      : 'text-(--type-2-fg) hover:bg-(--nav-item-bg-hover)',
                  )}
                >
                  <span className="truncate">{entry.title}</span>
                </Link>
              ))}
            </div>
          ))
        )}
      </div>
    </nav>
  );
}
