import type { JSX } from 'react';
import { Bookmark, Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SchemeMenuItem {
  id: string;
  name: string;
}

export interface SchemeMenuLabels {
  /** 「我的方案」节标题 */
  schemesTitle: string;
  /** 「管理方案…」 */
  manage: string;
  /** 徽标后缀「已修改」 */
  modified: string;
}

export interface SchemeMenuProps {
  /** 当前生效方案（徽标本体） */
  scheme: { id: string; name: string; modified: boolean };
  /** 可切换的方案列表；为空时下拉只剩「管理方案…」 */
  schemes?: SchemeMenuItem[];
  onApplyScheme?: (id: string) => void;
  onManageSchemes?: () => void;
  labels: SchemeMenuLabels;
}

export function SchemeMenu({
  scheme,
  schemes = [],
  onApplyScheme,
  onManageSchemes,
  labels,
}: SchemeMenuProps): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="filter-scheme-badge"
          className="inline-flex h-[calc(26px*var(--app-scale))] cursor-pointer items-center gap-[calc(4px*var(--app-scale))] rounded-sm bg-(--fill-selected) px-[calc(8px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))] font-medium text-(--table-action-fg)"
        >
          <Bookmark className="size-[calc(12px*var(--app-scale))]" aria-hidden="true" />
          {scheme.name}
          {scheme.modified ? ` · ${labels.modified}` : null}
          <ChevronDown className="size-[calc(11px*var(--app-scale))]" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" data-slot="filter-scheme-menu">
        {schemes.length > 0 && (
          <>
            <DropdownMenuLabel>{labels.schemesTitle}</DropdownMenuLabel>
            {schemes.map((item) => (
              <DropdownMenuItem key={item.id} onSelect={() => onApplyScheme?.(item.id)}>
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {item.id === scheme.id && (
                  <Check
                    aria-hidden="true"
                    className="size-[calc(14px*var(--app-scale))] text-(--table-action-fg)"
                  />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem data-slot="filter-scheme-manage" onSelect={() => onManageSchemes?.()}>
          {labels.manage}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
