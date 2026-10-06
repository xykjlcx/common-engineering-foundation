import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type FocusEvent,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/* 抄袭源：antd ProComponents EditableProTable（MIT）的三模式编辑语义 + coss/ui table（MIT）的表体质感；
   几何与状态逐字取自本仓画布板 design-explore/pipeline-board/DSAdditions.dc.html 4.8 节，
   颜色一律换成语义 token（板值 → token 映射）：
     ececea 外框与表头分隔 → --table-shell-border / --border
     f5f5f3 行分隔          → --table-row-border
     f0f0ee 增行条分隔      → --page-section-hairline
     fafaf9 表头与底栏底    → --table-header-bg
     fffcf7 编辑行底        → --pro-editing-bg
     e0680c 文字主操作      → --button-text-fg
     636361 文字次操作      → --text-2
     f97316 框 + 橙环       → 走 ui-field 状态机的 --field-border-focus / --field-ring-focus
     e5484d 框 / d94040 字  → --field-border-invalid / --field-ring-invalid / --danger
     b0b0ad / c4c4c1        → --text-faint
   本件不做 i18n：一切用户可见文案由 labels 注入（同 PickerPopover）。 */

export type EditableGridMode = 'row' | 'cell' | 'all';

export interface EditableGridCellContext {
  /** 当前草稿行在本列的文本值（由 column.read 取） */
  value: string;
  /** 写回草稿（内部经 column.write 落到整行） */
  onChange: (next: string) => void;
  /** 本格校验未通过（错误已到显形条件） */
  invalid: boolean;
  /** 本格校验文案，显形时同时渲染在控件下方 */
  error?: string;

  autoFocus: boolean;
}

export interface EditableGridColumn<Row> {
  key: string;
  title: ReactNode;
  /** 板列宽（px，内部乘 --app-scale）：摘要 260 / 借贷金额 130；不给则占满剩余（板「会计科目」列） */
  width?: number;
  align?: 'left' | 'right';
  /** 值走等宽字（金额 / 科目编码这类逐字符比对位） */
  mono?: boolean;
  /** 只读态渲染 */
  render: (row: Row) => ReactNode;
  /** 编辑态控件；不给就用内置 32px 输入框 */
  renderEditor?: (row: Row, context: EditableGridCellContext) => ReactNode;
  /** 草稿行 → 本格文本值。read / write 缺一本列即视为只读（编辑行里仍走 render） */
  read?: (row: Row) => string;
  /** 本格文本值 → 新草稿行（不可原地改 row） */
  write?: (row: Row, next: string) => Row;
}

export interface EditableGridLabels {
  edit: string;
  save: string;
  cancel: string;
  delete: string;
  /** 底部增行条文案；配 onAdd 才渲染 */
  addRow: string;

  addRowTop?: string;

  addRowHint?: string;
  /** 底栏右侧常驻提示（板「失焦即保存」） */
  blurSavesHint?: string;
  actionsTitle: ReactNode;
}

export interface EditableGridProps<Row> {
  columns: EditableGridColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** row = 点「编辑」整行变控件（默认）｜cell = 点格即编、失焦即存｜all = 整表编辑态 */
  mode?: EditableGridMode;
  /** 受控编辑行（row 模式）；不给则组件自持。all 模式恒为全部行，本 prop 不生效 */
  editingKeys?: string[];
  onEditingChange?: (keys: string[]) => void;
  onSave?: (row: Row) => void | Promise<void>;
  onCancel?: (row: Row) => void;
  onDelete?: (row: Row) => void;
  onAdd?: (event: { position: 'top' | 'bottom' }) => void;
  /** 返回 { 列 key: 文案 } 即阻止保存；返回 null 视为通过 */
  validate?: (row: Row) => Record<string, string> | null;
  labels: EditableGridLabels;

  footer?: ReactNode;

  hotkeys?: string[];
  /** 校验错误何时显形：touched（默认，改过或点过保存才红）｜always（导入后修正、状态矩阵场景直接红） */
  revealErrors?: 'touched' | 'always';
  className?: string;
  'aria-label'?: string;
}

const ACTIONS_WIDTH = 96;

const actionButtonBase =
  'cursor-pointer bg-transparent text-[calc(12.5px*var(--app-scale))] outline-none hover:underline focus-visible:underline disabled:cursor-not-allowed disabled:text-(--text-faint) disabled:no-underline';

function cellKeyOf(rowKey: string, columnKey: string) {
  return `${rowKey} ${columnKey}`;
}

function isEditableColumn<Row>(column: EditableGridColumn<Row>) {
  return Boolean(column.read && column.write);
}

export function EditableGrid<Row>({
  columns,
  rows,
  rowKey,
  mode = 'row',
  editingKeys,
  onEditingChange,
  onSave,
  onCancel,
  onDelete,
  onAdd,
  validate,
  labels,
  footer,
  hotkeys,
  revealErrors = 'touched',
  className,
  'aria-label': ariaLabel,
}: EditableGridProps<Row>): JSX.Element {
  const [uncontrolledEditing, setUncontrolledEditing] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Row>>({});
  const [revealed, setRevealed] = useState<string[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  /** cell 模式下 Tab / Enter 导航已经提交过本格，随后的 focusout 不再重复保存 */
  const [committed, setCommitted] = useState<string | null>(null);

  const editableColumns = useMemo(() => columns.filter(isEditableColumn), [columns]);
  const firstEditableKey = editableColumns[0]?.key;

  const gridTemplateColumns = useMemo(
    () =>
      [
        ...columns.map((column) =>
          column.width ? `calc(${column.width}px * var(--app-scale))` : 'minmax(0,1fr)',
        ),
        `calc(${ACTIONS_WIDTH}px * var(--app-scale))`,
      ].join(' '),
    [columns],
  );
  const gridStyle: CSSProperties = { gridTemplateColumns };

  const rowEditingKeys = useMemo(() => {
    if (mode === 'all') return rows.map(rowKey);
    if (mode === 'cell') return [];
    return editingKeys ?? uncontrolledEditing;
  }, [editingKeys, mode, rowKey, rows, uncontrolledEditing]);

  const setEditing = useCallback(
    (next: string[]) => {
      if (!editingKeys) setUncontrolledEditing(next);
      onEditingChange?.(next);
    },
    [editingKeys, onEditingChange],
  );

  const draftOf = useCallback((row: Row) => drafts[rowKey(row)] ?? row, [drafts, rowKey]);

  const errorsOf = useCallback(
    (key: string, row: Row) => {
      const found = validate?.(row) ?? null;
      if (!found) return null;
      if (revealErrors === 'always' || revealed.includes(key)) return found;
      return null;
    },
    [revealErrors, revealed, validate],
  );

  const clearDraft = useCallback((key: string) => {
    setDrafts((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setRevealed((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : prev));
  }, []);

  /** force = 用户明确点了「保存」；否则（cell 模式失焦 / Tab / Enter）只有改过才回调，不制造空保存 */
  const commit = useCallback(
    (row: Row, force = false) => {
      const key = rowKey(row);
      if (!force && !(key in drafts)) return true;
      const draft = drafts[key] ?? row;
      if (validate?.(draft)) {
        setRevealed((prev) => (prev.includes(key) ? prev : [...prev, key]));
        return false;
      }
      clearDraft(key);
      void onSave?.(draft);
      return true;
    },
    [clearDraft, drafts, onSave, rowKey, validate],
  );

  const startRowEdit = useCallback(
    (row: Row) => {
      const key = rowKey(row);
      setEditing([key]);
      if (firstEditableKey) setFocusTarget(cellKeyOf(key, firstEditableKey));
    },
    [firstEditableKey, rowKey, setEditing],
  );

  const cancelRowEdit = useCallback(
    (row: Row) => {
      const key = rowKey(row);
      clearDraft(key);
      setEditing([]);
      setFocusTarget(null);
      onCancel?.(row);
    },
    [clearDraft, onCancel, rowKey, setEditing],
  );

  const saveRowEdit = useCallback(
    (row: Row) => {
      if (!commit(row, true)) return;
      setEditing([]);
      setFocusTarget(null);
    },
    [commit, setEditing],
  );

  const writeCell = useCallback(
    (row: Row, column: EditableGridColumn<Row>, next: string) => {
      if (!column.write) return;
      const key = rowKey(row);
      const nextRow = column.write(drafts[key] ?? row, next);
      setDrafts((prev) => ({ ...prev, [key]: nextRow }));
      setRevealed((prev) => (prev.includes(key) ? prev : [...prev, key]));
      setCommitted(null);
    },
    [drafts, rowKey],
  );

  /** cell 模式：把活动格移到 delta 指定的下一格（1 = Tab，-1 = Shift+Tab） */
  const moveCell = useCallback(
    (row: Row, column: EditableGridColumn<Row>, delta: number) => {
      const currentKey = rowKey(row);
      const rowIndex = rows.findIndex((item) => rowKey(item) === currentKey);
      const columnIndex = editableColumns.findIndex((item) => item.key === column.key);
      if (rowIndex < 0 || columnIndex < 0) return;
      const flat = rowIndex * editableColumns.length + columnIndex + delta;
      if (flat < 0 || flat >= rows.length * editableColumns.length) return;
      const nextRow = rows[Math.floor(flat / editableColumns.length)];
      const nextColumn = editableColumns[flat % editableColumns.length];
      if (!nextRow || !nextColumn) return;
      const target = cellKeyOf(rowKey(nextRow), nextColumn.key);
      setActiveCell(target);
      setFocusTarget(target);
    },
    [editableColumns, rowKey, rows],
  );

  /** cell / all 模式：Enter 跳到同列下一行 */
  const moveRow = useCallback(
    (row: Row, column: EditableGridColumn<Row>) => {
      const currentKey = rowKey(row);
      const rowIndex = rows.findIndex((item) => rowKey(item) === currentKey);
      const nextRow = rows[rowIndex + 1];
      if (!nextRow) return;
      const target = cellKeyOf(rowKey(nextRow), column.key);
      if (mode === 'cell') setActiveCell(target);
      setFocusTarget(target);
    },
    [mode, rowKey, rows],
  );

  const handleCellKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, row: Row, column: EditableGridColumn<Row>) => {
      const key = rowKey(row);

      if (event.key === 'Escape') {
        event.preventDefault();

        if (mode === 'row') {
          cancelRowEdit(row);
          return;
        }
        if (column.write) {
          const restored = column.write(drafts[key] ?? row, column.read?.(row) ?? '');
          setDrafts((prev) => ({ ...prev, [key]: restored }));
        }
        if (mode === 'cell') {
          clearDraft(key);
          setActiveCell(null);
          setFocusTarget(null);
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (mode === 'row') {
          saveRowEdit(row);
          return;
        }
        if (mode === 'cell') {
          setCommitted(cellKeyOf(key, column.key));
          if (!commit(row)) return;
        }
        moveRow(row, column);
        return;
      }

      if (event.key === 'Tab' && mode === 'cell') {
        event.preventDefault();
        setCommitted(cellKeyOf(key, column.key));
        if (!commit(row)) return;
        moveCell(row, column, event.shiftKey ? -1 : 1);
      }
    },
    [cancelRowEdit, clearDraft, commit, drafts, mode, moveCell, moveRow, rowKey, saveRowEdit],
  );

  const handleCellBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>, row: Row, column: EditableGridColumn<Row>) => {
      if (mode !== 'cell') return;
      if (event.currentTarget.contains(event.relatedTarget)) return;
      const cell = cellKeyOf(rowKey(row), column.key);
      if (committed === cell) {
        setCommitted(null);
        return;
      }
      if (!commit(row)) return;
      setActiveCell((prev) => (prev === cell ? null : prev));
    },
    [committed, commit, mode, rowKey],
  );

  const renderCell = (row: Row, column: EditableGridColumn<Row>, editing: boolean) => {
    const key = rowKey(row);
    const draft = draftOf(row);
    const errors = editing ? errorsOf(key, draft) : null;
    const message = errors?.[column.key];

    if (!editing || !isEditableColumn(column)) {
      return (
        <div
          role="cell"
          key={column.key}
          data-slot="editable-grid-cell"
          data-column={column.key}
          onClick={
            mode === 'cell' && isEditableColumn(column)
              ? () => {
                  const target = cellKeyOf(key, column.key);
                  setActiveCell(target);
                  setFocusTarget(target);
                }
              : undefined
          }
          className={cn(
            'min-w-0 truncate pr-[calc(12px*var(--app-scale))]',
            column.align === 'right' && 'text-right',
            column.mono && 'font-mono',
            mode === 'cell' && isEditableColumn(column) && 'cursor-text',
          )}
        >
          {column.render(row)}
        </div>
      );
    }

    const context: EditableGridCellContext = {
      value: column.read?.(draft) ?? '',
      onChange: (next) => writeCell(row, column, next),
      invalid: Boolean(message),
      ...(message ? { error: message } : {}),
      autoFocus: focusTarget === cellKeyOf(key, column.key),
    };

    return (
      <div
        role="cell"
        key={column.key}
        data-slot="editable-grid-cell"
        data-column={column.key}
        data-editing=""
        onKeyDown={(event) => handleCellKeyDown(event, row, column)}
        onBlur={(event) => handleCellBlur(event, row, column)}
        className="flex min-w-0 flex-col gap-[calc(5px*var(--app-scale))] pr-[calc(12px*var(--app-scale))]"
      >
        {column.renderEditor ? (
          column.renderEditor(draft, context)
        ) : (
          <Input
            data-slot="editable-grid-editor"
            value={context.value}
            onChange={(event) => context.onChange(event.target.value)}
            aria-invalid={context.invalid || undefined}
            aria-label={typeof column.title === 'string' ? column.title : undefined}
            autoFocus={context.autoFocus}
            className={cn(
              'h-[calc(32px*var(--app-scale))] rounded-4 px-[calc(10px*var(--app-scale))] text-[calc(13px*var(--app-scale))]',
              column.align === 'right' && 'text-right',
              column.mono && 'font-mono',
            )}
          />
        )}
        {message ? (
          <span
            data-slot="editable-grid-error"
            className={cn(
              'text-[calc(11px*var(--app-scale))] text-(--danger)',
              column.align === 'right' && 'text-right',
            )}
          >
            {message}
          </span>
        ) : null}
      </div>
    );
  };

  const anotherRowEditing = (key: string) => rowEditingKeys.length > 0 && !rowEditingKeys.includes(key);

  /** 这一格现在是控件吗：cell 模式看活动格，row / all 模式看整行 */
  const cellEditing = (key: string, column: EditableGridColumn<Row>) =>
    mode === 'cell' ? activeCell === cellKeyOf(key, column.key) : rowEditingKeys.includes(key);

  return (
    <div
      data-slot="editable-grid"
      data-mode={mode}
      className={cn(
        'overflow-hidden rounded-4 border border-(--table-shell-border) bg-(--table-bg)',
        className,
      )}
    >
      {labels.addRowTop && onAdd ? (
        <button
          type="button"
          data-slot="editable-grid-add-top"
          onClick={() => onAdd({ position: 'top' })}
          className="flex h-[calc(36px*var(--app-scale))] w-full cursor-pointer items-center gap-[calc(7px*var(--app-scale))] border-b border-(--page-section-hairline) bg-transparent px-[calc(14px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))] text-(--button-text-fg) outline-none hover:underline focus-visible:underline"
        >
          <Plus aria-hidden="true" className="size-[calc(13px*var(--app-scale))]" />
          {labels.addRowTop}
        </button>
      ) : null}

      <div role="table" aria-label={ariaLabel}>
        <div
          role="row"
          data-slot="editable-grid-header"
          style={gridStyle}
          className="grid h-[calc(36px*var(--app-scale))] items-center border-b border-(--border) bg-(--table-header-bg) px-[calc(14px*var(--app-scale))] text-[calc(12px*var(--app-scale))] font-medium text-(--table-header-fg)"
        >
          {columns.map((column) => (
            <span
              role="columnheader"
              key={column.key}
              className={cn(
                'truncate pr-[calc(12px*var(--app-scale))]',
                column.align === 'right' && 'text-right',
              )}
            >
              {column.title}
            </span>
          ))}
          <span role="columnheader" className="truncate pr-[calc(12px*var(--app-scale))]">
            {labels.actionsTitle}
          </span>
        </div>

        {rows.map((row) => {
          const key = rowKey(row);
          const rowEditing = rowEditingKeys.includes(key);
          const draft = draftOf(row);
          const errors = rowEditing || mode === 'cell' ? errorsOf(key, draft) : null;
          // 只有「真在编辑态的格子」才算可见错误：cell 模式一次只一个格是控件，
          // 别的列即使校验不过也没地方显红字，行高不该跟着撑到 64
          const hasVisibleError = Boolean(
            errors && columns.some((column) => errors[column.key] && cellEditing(key, column)),
          );

          return (
            <div
              role="row"
              key={key}
              data-slot="editable-grid-row"
              data-row={key}
              data-editing={rowEditing ? '' : undefined}
              data-invalid={hasVisibleError ? '' : undefined}
              style={gridStyle}
              className={cn(
                'grid items-center border-b border-(--table-row-border) px-[calc(14px*var(--app-scale))] text-[calc(13.5px*var(--app-scale))] text-(--table-row-fg)',
                rowEditing && 'bg-(--pro-editing-bg)',
                hasVisibleError
                  ? 'h-[calc(64px*var(--app-scale))] items-start pt-[calc(6px*var(--app-scale))]'
                  : 'h-(--table-row-h-loose)',
              )}
            >
              {columns.map((column) => renderCell(row, column, cellEditing(key, column)))}
              <div
                role="cell"
                data-slot="editable-grid-actions"
                className="flex items-center gap-[calc(10px*var(--app-scale))]"
              >
                {mode === 'row' && rowEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => saveRowEdit(row)}
                      className={cn(actionButtonBase, 'text-(--button-text-fg)')}
                    >
                      {labels.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelRowEdit(row)}
                      className={cn(actionButtonBase, 'text-(--type-2-fg)')}
                    >
                      {labels.cancel}
                    </button>
                  </>
                ) : (
                  <>
                    {mode === 'row' ? (
                      <button
                        type="button"
                        disabled={anotherRowEditing(key)}
                        onClick={() => startRowEdit(row)}
                        className={cn(actionButtonBase, 'text-(--button-text-fg)')}
                      >
                        {labels.edit}
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        className={cn(actionButtonBase, 'text-(--type-2-fg)')}
                      >
                        {labels.delete}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {onAdd ? (
        <div className="flex h-[calc(40px*var(--app-scale))] items-center border-b border-(--page-section-hairline) px-[calc(14px*var(--app-scale))]">
          <button
            type="button"
            data-slot="editable-grid-add"
            onClick={() => onAdd({ position: 'bottom' })}
            className="flex cursor-pointer items-center gap-[calc(7px*var(--app-scale))] bg-transparent text-[calc(13px*var(--app-scale))] text-(--button-text-fg) outline-none hover:underline focus-visible:underline"
          >
            <Plus aria-hidden="true" className="size-[calc(14px*var(--app-scale))]" />
            {labels.addRow}
          </button>
          {labels.addRowHint ? (
            <span className="ml-[calc(8px*var(--app-scale))] text-[calc(12px*var(--app-scale))] text-(--text-faint)">
              {labels.addRowHint}
            </span>
          ) : null}
        </div>
      ) : null}

      {hotkeys && hotkeys.length > 0 ? (
        <div
          data-slot="editable-grid-hotkeys"
          className="flex h-[calc(34px*var(--app-scale))] items-center gap-[calc(12px*var(--app-scale))] bg-(--table-header-bg) px-[calc(14px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--text-faint)"
        >
          {hotkeys.map((hint) => (
            <span key={hint}>{hint}</span>
          ))}
          {labels.blurSavesHint ? <span className="ml-auto">{labels.blurSavesHint}</span> : null}
        </div>
      ) : null}

      {footer ? (
        <div
          data-slot="editable-grid-footer"
          className="flex h-[calc(44px*var(--app-scale))] items-center gap-[calc(10px*var(--app-scale))] border-t border-(--page-section-hairline) bg-(--table-header-bg) px-[calc(14px*var(--app-scale))] text-[calc(13px*var(--app-scale))]"
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
