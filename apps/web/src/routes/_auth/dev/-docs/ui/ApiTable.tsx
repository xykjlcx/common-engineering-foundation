import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ApiComponent } from '../types';

// 组件站私有件：一个组件一张 props 表。数据来自 `pnpm docs:api` 生成的 api.generated.json，
// 手写补充一律不接——表里出现"文档说有、代码里没有"的 prop 比没有表更糟。
export interface ApiTableProps {
  /** 注册表 DocEntry.api 里登记的 displayName（产物里查不到时用它报缺） */
  name: string;
  component?: ApiComponent;
  /** 一页多个组件时给每张表带小标题；单表页可关掉 */
  showTitle?: boolean;
}

export function ApiTable({ name, component, showTitle = true }: ApiTableProps) {
  return (
    <section data-slot="doc-api-table" data-component={name} className="flex flex-col gap-2">
      {showTitle && (
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="font-mono text-[calc(14px*var(--app-scale))] font-semibold text-text">{name}</h3>
          {component?.source && (
            <span className="font-mono text-[calc(12px*var(--app-scale))] text-text-3">
              {component.source}
            </span>
          )}
        </div>
      )}
      {component?.description && (
        <p className="max-w-[72ch] text-[calc(13px*var(--app-scale))] text-(--type-2-fg)">
          {component.description}
        </p>
      )}
      {!component ? (
        <p className="rounded-8 border border-dashed border-border px-3 py-2 text-[calc(13px*var(--app-scale))] text-text-3">
          产物里没有 {name}：注册表 api 名与组件导出名对不上，或还没跑{' '}
          <code className="font-mono">pnpm docs:api</code>。
        </p>
      ) : component.props.length === 0 ? (
        <p className="rounded-8 border border-dashed border-border px-3 py-2 text-[calc(13px*var(--app-scale))] text-text-3">
          该组件没有本仓自有 props（只透传原生属性）。
        </p>
      ) : (
        <div className="overflow-hidden rounded-8 border border-border">
          <Table className="table-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">属性</TableHead>
                <TableHead className="w-[34%]">说明</TableHead>
                <TableHead className="w-[26%]">类型</TableHead>
                <TableHead className="w-[10%]">默认值</TableHead>
                <TableHead className="w-[8%]">必填</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {component.props.map((prop) => (
                <TableRow key={prop.name}>
                  <TableCell className="h-auto whitespace-normal py-2 align-top font-mono text-[calc(12.5px*var(--app-scale))] text-text">
                    {prop.name}
                  </TableCell>
                  <TableCell className="h-auto whitespace-pre-line py-2 align-top text-[calc(13px*var(--app-scale))] text-(--type-2-fg)">
                    {prop.description || '—'}
                  </TableCell>
                  <TableCell className="h-auto whitespace-normal py-2 align-top font-mono text-[calc(12px*var(--app-scale))] break-words text-text-3">
                    {prop.type}
                  </TableCell>
                  <TableCell className="h-auto whitespace-normal py-2 align-top font-mono text-[calc(12px*var(--app-scale))] break-words text-text-3">
                    {prop.defaultValue ?? '—'}
                  </TableCell>
                  <TableCell className="h-auto whitespace-normal py-2 align-top">
                    {prop.required ? (
                      <Badge variant="danger">必填</Badge>
                    ) : (
                      <span className="text-[calc(13px*var(--app-scale))] text-text-3">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
