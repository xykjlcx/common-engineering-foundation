import { useState, type JSX, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { InputGroup, InputGroupInput, InputGroupSuffix } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { FilterCondition, FilterFieldDef } from '../../filter-builder/types';
import { CommitHint } from './CommitHint';
import { conditionId } from './panel-utils';
import type { FilterValuePanelLabels } from './labels';

type TextOperator = 'contains' | 'eq' | 'isEmpty';

export function TextPanel({
  field,
  condition,
  labels,
  autoFocus,
  onCommit,
  onDraftChange,
}: {
  field: FilterFieldDef;
  condition: FilterCondition | null;
  labels: FilterValuePanelLabels;
  autoFocus: boolean;
  onCommit: (next: FilterCondition | null) => void;
  onDraftChange: (next: FilterCondition | null) => void;
}): JSX.Element {
  const initialOp: TextOperator =
    condition?.operator === 'eq' || condition?.operator === 'isEmpty' ? condition.operator : 'contains';
  const [operator, setOperator] = useState<TextOperator>(initialOp);
  const [text, setText] = useState(typeof condition?.value === 'string' ? condition.value : '');

  const publish = (nextOp: TextOperator, nextText: string, commit: boolean) => {
    const next: FilterCondition | null =
      nextOp === 'isEmpty'
        ? { id: conditionId(field.key, condition), field: field.key, operator: 'isEmpty', value: null }
        : nextText.trim() === ''
          ? null
          : {
              id: conditionId(field.key, condition),
              field: field.key,
              operator: nextOp,
              value: nextText,
            };
    onDraftChange(next);
    if (commit) onCommit(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      publish(operator, text, true);
    }
  };

  const ops: { key: TextOperator; label: string }[] = [
    { key: 'contains', label: labels.textOps.contains },
    { key: 'eq', label: labels.textOps.eq },
    { key: 'isEmpty', label: labels.textOps.isEmpty },
  ];

  return (
    <div data-slot="filter-value-panel" data-kind="text" className="p-[calc(10px*var(--app-scale))]">
      <div className="mb-[calc(8px*var(--app-scale))] flex gap-[calc(4px*var(--app-scale))]">
        {ops.map((op) => (
          <button
            key={op.key}
            type="button"
            data-active={operator === op.key || undefined}
            className={cn(
              'h-[calc(26px*var(--app-scale))] cursor-pointer rounded-md px-[calc(10px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))]',
              operator === op.key
                ? 'bg-(--fill-selected) font-medium text-(--table-action-fg)'
                : 'text-(--type-2-fg) hover:bg-(--menu-item-bg-highlighted)',
            )}
            onClick={() => {
              setOperator(op.key);
              publish(op.key, text, false);
            }}
          >
            {op.label}
          </button>
        ))}
      </div>
      {operator !== 'isEmpty' && (
        <InputGroup>
          <InputGroupInput
            type="text"
            autoFocus={autoFocus}
            value={text}
            aria-label={field.label}
            onChange={(event) => {
              const next = event.target.value;
              setText(next);
              publish(operator, next, false);
            }}
            onKeyDown={onKeyDown}
          />
          {/* 快捷清空：不用进 chips 里删——清空即撤掉本条件并提交，菜单随之收起 */}
          {text !== '' && (
            <InputGroupSuffix>
              <button
                type="button"
                aria-label={labels.clearText}
                data-slot="filter-text-clear"
                className="flex cursor-pointer items-center text-(--field-placeholder) outline-none hover:text-(--type-2-fg) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--field-ring-focus)"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setText('');
                  publish(operator, '', true);
                }}
              >
                <X aria-hidden="true" className="size-[calc(14px*var(--app-scale))]" />
              </button>
            </InputGroupSuffix>
          )}
        </InputGroup>
      )}
      <p className="mt-[calc(6px*var(--app-scale))] text-[calc(11.5px*var(--app-scale))] text-(--text-3)">
        {labels.enterHint}
      </p>
      <CommitHint text={labels.commitHint} />
    </div>
  );
}
