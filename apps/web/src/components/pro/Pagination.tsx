import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Pagination —— 贴卡底的分页条。
 *
 * 板：design-explore/pipeline-board/UserList.dc.html L127-136（**全画布 16 板逐字节同值**，
 * 另见 DeptTree L146 / FilterBuilder L355 / ActionDark L350 / VouchersSharp L374 …）。逐值出处：
 *   · 条本体   L127  flex-shrink:0; height:46px; display:flex; align-items:center; gap:6px;
 *                    padding:0 20px; border-top:1px solid #efefed; box-sizing:border-box
 *   · 总数     L128  font-size:13px; color:#9a9a97
 *   · 撑开     L129  flex-grow:1（板用空 div，这里用 flex-1 的 span）
 *   · 翻页钮   L130/135  28×28; border-radius:4px; svg 14×14 stroke-width:1.8；**无边框无底色**
 *                    禁用态 stroke=#b0b0ad，可用态 stroke=#636361（→ --pagination-nav-fg / -disabled）
 *   · 当前页   L131  28×28; radius 4; background:#ffffff; border:1px solid #ececea;
 *                    box-shadow:0 1px 2px rgba(0,0,0,0.04); font-size:13px; font-weight:500; color:#1c1c1a
 *   · 其他页   L132  28×28; radius 4; font-size:13px; color:#636361
 *   · 省略号   L133  28×28; radius 4; font-size:13px; color:#636361
 *   · 多位页码 L134  height:28px; padding:0 8px（**不是定宽 28**）; radius 4; 13px #636361; 数字走 mono
 *   · 每页条数 L136  height:28px; padding:0 10px; gap:6px; radius 4; background:#fdfdfc;
 *                    border:1px solid #ececea; font-size:12.5px; color:#636361; chevron svg 11×11 stroke=#9a9a97
 *
 * 落 token：46/20/6 = --pagination-bar-h / -px / gap 走共享几何；#efefed = --pagination-bar-border；
 * #9a9a97 = --pagination-total-fg；28 = --control-sm；当前页配色 = --pagination-current-*；
 * 每页条数钮 = Button variant="secondary"（底 #fdfdfc + 边 #ececea 即 --button-secondary-*）。
 *
 * 「每页条数」是**可选槽位**（与 PickerPopover 的 onCreate 同型）：不传 pageSize 就不渲染，
 * 板上没有该控件的页面（如 DeptTree 成员表）保持原样。
 *
 * pro 组件纪律：不 useTranslation、不 import @/modules/**，文案全部经 props 注入。
 */

type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

const paginationNavClassName =
  'text-(--pagination-nav-fg) disabled:text-(--pagination-nav-fg-disabled) disabled:opacity-100 [&_svg]:size-[calc(14px*var(--app-scale))] [&_svg]:stroke-[1.8]';

/** 每页条数选择器（可选槽位）。文案由业务注入，pro 层不做 i18n / 数字格式化。 */
export interface PaginationPageSize {
  value: number;
  options: number[];
  /** 如 (15) => '15 条/页' */
  label: (size: number) => string;
  onChange: (size: number) => void;
  /** 触发器的可访问名，如「每页条数」 */
  ariaLabel: string;
}

function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(page, 1), Math.max(pageCount, 1));
}

function buildPaginationItems(page: number, pageCount: number): PaginationItem[] {
  const normalizedPageCount = Math.max(pageCount, 1);
  const currentPage = clampPage(page, normalizedPageCount);

  if (normalizedPageCount <= 7) {
    return Array.from({ length: normalizedPageCount }, (_, index) => index + 1);
  }

  const pageNumbers = new Set(
    [1, currentPage - 1, currentPage, currentPage + 1, normalizedPageCount].filter(
      (pageNumber) => pageNumber >= 1 && pageNumber <= normalizedPageCount,
    ),
  );
  const sortedPageNumbers = [...pageNumbers].sort((left, right) => left - right);
  const items: PaginationItem[] = [];

  sortedPageNumbers.forEach((pageNumber, index) => {
    const previousPageNumber = sortedPageNumbers[index - 1];

    if (previousPageNumber !== undefined) {
      const gap = pageNumber - previousPageNumber;

      if (gap === 2) {
        items.push(previousPageNumber + 1);
      } else if (gap > 2) {
        items.push(index === 1 ? 'ellipsis-start' : 'ellipsis-end');
      }
    }

    items.push(pageNumber);
  });

  return items;
}

export function Pagination({
  page,
  pageCount,
  totalLabel,
  refreshingLabel,
  prevLabel,
  nextLabel,
  currentLabel,
  onPageChange,
  pageSize,
  className,
}: {
  page: number;
  pageCount: number;
  totalLabel: string;
  refreshingLabel?: string;
  prevLabel: string;
  nextLabel: string;
  currentLabel: string;
  onPageChange: (page: number) => void;

  pageSize?: PaginationPageSize;
  className?: string;
}) {
  const currentPage = clampPage(page, pageCount);
  const normalizedPageCount = Math.max(pageCount, 1);
  const items = buildPaginationItems(currentPage, normalizedPageCount);

  return (
    <div
      data-slot="pagination-bar"
      className={cn(
        'flex h-[var(--pagination-bar-h)] shrink-0 items-center gap-[calc(6px*var(--app-scale))] border-t border-(--pagination-bar-border) px-[var(--pagination-bar-px)]',
        className,
      )}
    >
      <span className="text-[calc(13px*var(--app-scale))] text-(--pagination-total-fg)">
        {totalLabel}
        {refreshingLabel && <span className="ml-3 text-(--pagination-current-fg)">{refreshingLabel}</span>}
      </span>
      {/* 板 L129：flex-grow:1 的空 div 把翻页组推到右侧 */}
      <span aria-hidden="true" className="flex-1" />
      <nav aria-label={currentLabel}>
        <ul className="flex items-center gap-[calc(6px*var(--app-scale))] text-[calc(13px*var(--app-scale))] text-(--type-2-fg)">
          <li>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={paginationNavClassName}
              aria-label={prevLabel}
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          </li>
          {items.map((item) => (
            <li key={item}>
              {typeof item === 'number' ? (
                <Button
                  type="button"
                  variant={item === currentPage ? 'outline' : 'ghost'}

                  size={String(item).length > 1 ? 'sm' : 'icon-sm'}
                  className={cn(
                    'tabular-nums',
                    String(item).length > 1 && 'px-[calc(8px*var(--app-scale))] font-mono',
                    item === currentPage &&
                      'border-(--pagination-current-border) bg-(--pagination-current-bg) text-(--pagination-current-fg) hover:bg-(--pagination-current-bg) hover:text-(--pagination-current-fg)',
                  )}
                  aria-label={item === currentPage ? currentLabel : undefined}
                  aria-current={item === currentPage ? 'page' : undefined}
                  onClick={item === currentPage ? undefined : () => onPageChange(item)}
                >
                  {item}
                </Button>
              ) : (
                <span
                  aria-hidden="true"
                  data-slot="pagination-ellipsis"
                  className="flex size-[var(--control-sm)] items-center justify-center text-(--table-header-fg)"
                >
                  {/* 板 L133 是单字符省略号 … 不是三个点 */}…
                </span>
              )}
            </li>
          ))}
          <li>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={paginationNavClassName}
              aria-label={nextLabel}
              disabled={currentPage >= normalizedPageCount}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </li>
        </ul>
      </nav>
      {pageSize && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={pageSize.ariaLabel}
              data-slot="pagination-page-size"

              // 这里只补板的 10px 内距、6px 间距与 12.5px 字号）
              className="gap-[calc(6px*var(--app-scale))] px-[calc(10px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))]"
            >
              {pageSize.label(pageSize.value)}
              <ChevronDown
                aria-hidden="true"
                data-icon="inline-end"
                className="size-[calc(11px*var(--app-scale))] text-(--pagination-total-fg)"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {pageSize.options.map((option) => (
              <DropdownMenuItem
                key={option}
                data-active={option === pageSize.value || undefined}
                onSelect={() => pageSize.onChange(option)}
              >
                {pageSize.label(option)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
