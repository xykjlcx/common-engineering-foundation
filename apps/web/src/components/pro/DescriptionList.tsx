import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/* 就地编辑（editable）部分抄袭源：antd ProComponents ProDescriptions editable（MIT）的单字段点改语义；
   几何与五态逐字取自本仓画布板 design-explore/pipeline-board/DSAdditions.dc.html 4.10 节，
   颜色换成语义 token：f5f5f4 hover 底 → --option-bg-highlighted，fffcf7 编辑行底 → --pro-editing-bg，
   f97316 框 + 橙环 → 走 ui-field 状态机，0c9d58 已保存 → --success，b0b0ad 保存中 → --text-faint，
   636361 铅笔 → --text-2。文案全部由 editLabels / labels 注入，本件不做 i18n。 */

export interface DescriptionListEditable {
  /** 字段当前值（编辑器的初值） */
  value: string;
  onSave: (next: string) => void | Promise<void>;
  /** 自定义编辑器；不给就用内置 32px 输入框 */
  renderEditor?: (context: DescriptionListEditorContext) => ReactNode;

  readOnly?: boolean;
}

export interface DescriptionListEditorContext {
  value: string;
  onChange: (next: string) => void;
  /** 挂在编辑器上以支持 Enter 保存 / Esc 取消 */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  autoFocus: boolean;
}

export interface DescriptionListEditLabels {
  /** 铅笔钮无障碍名；label 是字符串时自动拼成「编辑 姓名」 */
  edit: string;
  save: string;
  cancel: string;
  saving: string;
  saved: string;
}

export interface DescriptionListItem {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;

  mono?: boolean;

  editable?: DescriptionListEditable;
}

type EditStatus = { index: number; kind: 'saving' | 'saved' } | null;

export function DescriptionList({
  items,
  columns = 1,
  density = 'compact',
  size = 'default',
  presentation = 'plain',
  divided = false,
  empty,
  editLabels,
  className,
}: {
  items: DescriptionListItem[];
  columns?: 1 | 2 | 3 | 4 | 5;
  density?: 'default' | 'compact';

  size?: 'default' | 'compact' | 'field';
  presentation?: 'plain' | 'cards';
  /** size="compact" 专用：行间加 1px 分隔线 */
  divided?: boolean;
  empty?: ReactNode;
  /** 开 item.editable 时必给：保存 / 取消 / 保存中 / 已保存 / 铅笔的文案 */
  editLabels?: DescriptionListEditLabels;
  className?: string;
}) {
  const [active, setActive] = useState<{ index: number; draft: string } | null>(null);
  const [status, setStatus] = useState<EditStatus>(null);

  useEffect(() => {
    if (status?.kind !== 'saved') return;
    const timer = setTimeout(() => setStatus(null), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const beginEdit = (index: number, item: DescriptionListItem) => {
    if (!item.editable || item.editable.readOnly) return;
    setStatus(null);
    setActive({ index, draft: item.editable.value });
  };

  const saveEdit = async (index: number, item: DescriptionListItem, draft: string) => {
    if (!item.editable) return;
    setActive(null);
    setStatus({ index, kind: 'saving' });
    await Promise.resolve(item.editable.onSave(draft));
    setStatus({ index, kind: 'saved' });
  };

  const renderEditor = (index: number, item: DescriptionListItem, draft: string) => {
    const editable = item.editable;
    if (!editable) return null;
    const context: DescriptionListEditorContext = {
      value: draft,
      onChange: (next) => setActive({ index, draft: next }),
      onKeyDown: (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void saveEdit(index, item, draft);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setActive(null);
        }
      },
      autoFocus: true,
    };

    if (editable.renderEditor) return editable.renderEditor(context);

    return (
      <Input
        data-slot="description-list-editor"
        value={context.value}
        onChange={(event) => context.onChange(event.target.value)}
        onKeyDown={context.onKeyDown}
        aria-label={typeof item.label === 'string' ? item.label : undefined}
        autoFocus
        className={cn(
          'h-[calc(32px*var(--app-scale))] rounded-4 px-[calc(10px*var(--app-scale))] text-[calc(13px*var(--app-scale))]',
          item.mono && 'font-mono',
        )}
      />
    );
  };

  /** 值区右侧的态位：铅笔（hover 才显）/ 保存·取消 / 保存中转圈 / 已保存绿勾 */
  const renderAffordance = (index: number, item: DescriptionListItem, draft: string | null) => {
    if (!item.editable || !editLabels) return null;

    if (draft !== null) {
      return (
        <span
          data-slot="description-list-edit-actions"
          className="ml-[calc(8px*var(--app-scale))] inline-flex shrink-0 gap-[calc(6px*var(--app-scale))]"
        >
          <Button
            type="button"
            size="xs"
            onClick={() => void saveEdit(index, item, draft)}
            className="h-[calc(26px*var(--app-scale))] rounded-4 px-[calc(12px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))]"
          >
            {editLabels.save}
          </Button>
          <Button
            type="button"
            variant="text"
            size="xs"
            onClick={() => setActive(null)}
            className="h-[calc(26px*var(--app-scale))] rounded-4 px-[calc(8px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))]"
          >
            {editLabels.cancel}
          </Button>
        </span>
      );
    }

    if (status?.index === index && status.kind === 'saving') {
      return (
        <span
          data-slot="description-list-saving"
          className="inline-flex shrink-0 items-center gap-[calc(5px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--text-faint)"
        >
          <span
            aria-hidden="true"
            className="size-[calc(12px*var(--app-scale))] animate-spin rounded-full border-[calc(2px*var(--app-scale))] border-(--border) border-t-(--pri)"
          />
          {editLabels.saving}
        </span>
      );
    }

    if (status?.index === index && status.kind === 'saved') {
      return (
        <span
          data-slot="description-list-saved"
          className="inline-flex shrink-0 items-center gap-[calc(4px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--success)"
        >
          <Check aria-hidden="true" className="size-[calc(11px*var(--app-scale))]" />
          {editLabels.saved}
        </span>
      );
    }

    if (item.editable.readOnly) return null;

    return (
      <button
        type="button"
        data-slot="description-list-edit-trigger"
        aria-label={typeof item.label === 'string' ? `${editLabels.edit} ${item.label}` : editLabels.edit}
        onClick={() => beginEdit(index, item)}
        className="inline-flex size-[calc(24px*var(--app-scale))] shrink-0 cursor-pointer items-center justify-center rounded-4 bg-transparent text-(--type-2-fg) opacity-0 outline-none group-hover/desc-row:opacity-100 focus-visible:opacity-100"
      >
        <Pencil aria-hidden="true" className="size-[calc(13px*var(--app-scale))]" />
      </button>
    );
  };

  const rowStateClassName = (item: DescriptionListItem, editing: boolean) =>
    cn(
      item.editable && editLabels && 'group/desc-row',
      item.editable &&
        editLabels &&
        !item.editable.readOnly &&
        !editing &&
        'hover:bg-(--option-bg-highlighted)',
      editing && 'bg-(--pro-editing-bg)',
    );

  const draftOf = (index: number) => (active?.index === index ? active.draft : null);

  if (items.length === 0) {
    return (
      <div
        data-slot="description-list-empty"
        data-presentation={presentation}
        className={cn(
          'py-6 text-center text-sm text-text-3',
          presentation === 'cards' &&
            'mt-3 rounded-10 border border-(--page-section-divider) bg-(--pro-panel-bg) px-3',
        )}
      >
        {empty}
      </div>
    );
  }

  if (size === 'field' && presentation === 'plain') {
    return (
      <dl
        data-slot="description-list"
        data-density={density}
        data-size="field"
        data-presentation={presentation}
        className={cn('grid gap-[calc(2px*var(--app-scale))]', className)}
      >
        {items.map((item, index) => {
          const draft = draftOf(index);
          return (
            <div
              key={index}
              data-slot="description-list-item"
              data-editing={draft !== null ? '' : undefined}
              className={cn(
                'flex items-center rounded-4 px-[calc(10px*var(--app-scale))]',
                draft !== null
                  ? 'min-h-[calc(44px*var(--app-scale))]'
                  : 'min-h-[calc(36px*var(--app-scale))]',
                rowStateClassName(item, draft !== null),
              )}
            >
              <dt className="w-[calc(96px*var(--app-scale))] shrink-0 truncate text-[calc(12.5px*var(--app-scale))] text-(--desc-label-fg)">
                {item.label}
              </dt>
              <dd
                className={cn(
                  'min-w-0 flex-1 text-[calc(13px*var(--app-scale))]',
                  item.mono && 'font-mono',
                  status?.index === index && status.kind === 'saving'
                    ? 'text-(--type-2-fg)'
                    : 'text-(--text)',
                  draft === null && 'truncate',
                )}
              >
                {draft !== null ? renderEditor(index, item, draft) : item.value}
              </dd>
              {renderAffordance(index, item, draft)}
              {item.actions ? (
                <div data-slot="description-list-actions" className="flex shrink-0 items-center gap-1.5">
                  {item.actions}
                </div>
              ) : null}
            </div>
          );
        })}
      </dl>
    );
  }

  if (size === 'compact' && presentation === 'plain') {
    const compactColumns = columns >= 2 ? 2 : 1;
    return (
      <dl
        data-slot="description-list"
        data-density={density}
        data-size="compact"
        data-presentation={presentation}
        className={cn(
          'grid',
          compactColumns === 2 && 'gap-x-[calc(28px*var(--app-scale))] sm:grid-cols-2',
          className,
        )}
      >
        {items.map((item, index) => {
          const draft = draftOf(index);
          return (
            <div
              key={index}
              data-slot="description-list-item"
              data-editing={draft !== null ? '' : undefined}
              className={cn(
                'flex h-[calc(26px*var(--app-scale))] items-center gap-[calc(10px*var(--app-scale))]',
                divided && index >= compactColumns && 'border-t border-(--table-row-border)',
                draft !== null && 'h-[calc(44px*var(--app-scale))]',
                rowStateClassName(item, draft !== null),
              )}
            >
              <dt
                title={typeof item.label === 'string' ? item.label : undefined}
                className={cn(
                  'shrink-0 truncate text-[calc(12.5px*var(--app-scale))] text-(--desc-label-fg)',
                  compactColumns === 2
                    ? 'w-[calc(132px*var(--app-scale))]'
                    : 'w-[calc(62px*var(--app-scale))]',
                )}
              >
                {item.label}
              </dt>
              <dd
                className={cn(
                  'min-w-0 flex-1 text-[calc(13px*var(--app-scale))]',
                  item.mono && 'font-mono',
                  status?.index === index && status.kind === 'saving'
                    ? 'text-(--type-2-fg)'
                    : 'text-(--text)',
                  draft === null && 'truncate',
                )}
              >
                {draft !== null ? renderEditor(index, item, draft) : item.value}
              </dd>
              {renderAffordance(index, item, draft)}
              {item.actions ? (
                <div data-slot="description-list-actions" className="flex shrink-0 items-center gap-1.5">
                  {item.actions}
                </div>
              ) : null}
            </div>
          );
        })}
      </dl>
    );
  }

  return (
    <dl
      data-slot="description-list"
      data-density={density}
      data-size={size}
      data-presentation={presentation}
      className={cn(
        'grid text-sm',
        presentation === 'plain' && (density === 'default' ? 'mt-6 gap-4' : 'mt-2 gap-x-6 gap-y-1'),
        presentation === 'cards' && 'mt-3 gap-1.5',
        presentation === 'plain' && columns === 2 && 'sm:grid-cols-2',
        presentation === 'plain' && columns === 3 && 'md:grid-cols-3',
        presentation === 'plain' && columns === 4 && 'md:grid-cols-2 xl:grid-cols-4',
        presentation === 'plain' && columns === 5 && 'md:grid-cols-2 xl:grid-cols-5',
        className,
      )}
    >
      {items.map((item, index) => {
        const draft = draftOf(index);
        return (
          <div
            key={index}
            data-slot="description-list-item"
            data-editing={draft !== null ? '' : undefined}
            className={cn(
              presentation === 'plain' &&
                density === 'compact' &&
                'flex min-h-[calc(38px*var(--app-scale))] items-start justify-between gap-3 py-1',
              presentation === 'cards' &&
                'flex min-h-[calc(58px*var(--app-scale))] items-center justify-between gap-3 rounded-10 border border-(--page-section-divider) bg-(--pro-panel-bg) px-3 py-2.5 shadow-card-sm',
              rowStateClassName(item, draft !== null),
            )}
          >
            <div className="min-w-0">
              <dt
                className={cn(
                  'truncate',
                  presentation === 'cards' ? 'font-medium text-text' : 'text-xs text-text-3',
                )}
              >
                {item.label}
              </dt>
              <dd
                className={cn(
                  'mt-0.5',
                  presentation === 'cards' ? 'text-xs text-text-3' : 'text-sm font-medium text-text',
                  draft === null && 'truncate',
                  status?.index === index && status.kind === 'saving' && 'text-(--type-2-fg)',
                )}
              >
                {draft !== null ? renderEditor(index, item, draft) : item.value}
              </dd>
              {item.description && <dd className="mt-1 text-(--type-2-fg)">{item.description}</dd>}
            </div>
            {renderAffordance(index, item, draft)}
            {item.actions ? (
              <div data-slot="description-list-actions" className="flex shrink-0 items-center gap-1.5">
                {item.actions}
              </div>
            ) : null}
          </div>
        );
      })}
    </dl>
  );
}
