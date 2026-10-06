import { useState, type JSX } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { FilterCondition, FilterFieldDef } from '../../filter-builder/types';
import { CommitHint } from './CommitHint';
import { conditionId, toStringList } from './panel-utils';
import type { FilterValuePanelLabels } from './labels';

export function SelectPanel({
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
  const single = field.input === 'select';
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(() => toStringList(condition?.value ?? null));
  const options = field.options ?? [];
  const showSearch = options.length >= 8;
  const filtered = options.filter((option) =>
    query.trim() === '' ? true : option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const publish = (nextSelected: string[], commit: boolean) => {
    const next: FilterCondition | null =
      nextSelected.length === 0
        ? null
        : {
            id: conditionId(field.key, condition),
            field: field.key,
            operator: single ? 'eq' : 'in',
            value: single ? (nextSelected[0] ?? '') : nextSelected,
          };
    onDraftChange(next);
    if (commit) onCommit(next);
  };

  return (
    <div data-slot="filter-value-panel" data-kind={single ? 'select' : 'multiSelect'}>
      {showSearch && (
        <div className="border-b border-(--overlay-border)">
          <Input
            type="text"
            autoFocus={autoFocus}
            value={query}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            data-variant="embedded"
            className="rounded-none border-0 bg-transparent shadow-none"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}
      <div
        role="group"
        aria-label={field.label}
        className="max-h-[calc(240px*var(--app-scale))] overflow-y-auto py-[calc(4px*var(--app-scale))]"
      >
        {filtered.length === 0 && (
          <p className="px-[calc(12px*var(--app-scale))] py-[calc(8px*var(--app-scale))] text-[calc(13px*var(--app-scale))] text-(--text-3)">
            {labels.empty}
          </p>
        )}
        {filtered.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className="flex h-[calc(32px*var(--app-scale))] cursor-pointer items-center gap-[calc(8px*var(--app-scale))] px-[calc(12px*var(--app-scale))] text-[calc(13px*var(--app-scale))] hover:bg-(--menu-item-bg-highlighted)"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(nextChecked) => {
                  if (single) {
                    const next = nextChecked ? [option.value] : [];
                    setSelected(next);
                    publish(next, true);
                    return;
                  }
                  const set = new Set(selected);
                  if (nextChecked) set.add(option.value);
                  else set.delete(option.value);
                  const next = [...set];
                  setSelected(next);
                  publish(next, false);
                }}
              />
              <span className="truncate">{option.label}</span>
            </label>
          );
        })}
      </div>
      <CommitHint text={labels.commitHint} />
    </div>
  );
}
