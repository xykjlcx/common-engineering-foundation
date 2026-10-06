import type { JSX, ReactNode } from 'react';
import { SegmentedProgress } from '@/components/pro/SegmentedProgress';

// 分段进度状态矩阵（SegmentedProgress 0% / 部分 / 100%）。
// 说明：这是 dev-only 状态矩阵，示例文案直接取自原型板（DeptTree 编制占用）的板上原文，
// 作为夹具数据不进 i18n 资源。

function Cell({ id, title, children }: { id: string; title: string; children: ReactNode }): JSX.Element {
  return (
    <div data-testid={`rowMenuPicker.${id}`} className="grid gap-2">
      <p className="text-xs font-medium text-(--type-2-fg)">{title}</p>
      <div className="rounded-md border border-border bg-surface p-4">{children}</div>
    </div>
  );
}

export default function SegmentedProgressMatrix(): JSX.Element {
  return (
    <section
      data-testid="segmentedProgressMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">分段进度状态矩阵</h2>
        <p className="text-sm text-(--type-2-fg)">SegmentedProgress（0% / 80% / 100%，格数由 max 决定）</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Cell id="SegmentedProgress.zero" title="分段进度：0%">
          <SegmentedProgress value={0} max={15} label="0 / 15" aria-label="编制占用" />
        </Cell>

        <Cell id="SegmentedProgress.partial" title="分段进度：80%（板 12 / 15）">
          <SegmentedProgress value={12} max={15} label="12 / 15" aria-label="编制占用" />
        </Cell>

        <Cell id="SegmentedProgress.full" title="分段进度：100%">
          <SegmentedProgress value={15} max={15} label="15 / 15" aria-label="编制占用" />
        </Cell>
      </div>
    </section>
  );
}
