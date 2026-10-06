import type { JSX } from 'react';
import type { FilterCondition, FilterFieldDef } from '../filter-builder/types';
import { DateRangePanel } from './panels/DateRangePanel';
import { SelectPanel } from './panels/SelectPanel';
import { TextPanel } from './panels/TextPanel';
import { TreePanel } from './panels/TreePanel';
import type { FilterValuePanelLabels } from './panels/labels';

export type { FilterValuePanelLabels };

export interface FilterValuePanelProps {
  field: FilterFieldDef;
  condition: FilterCondition | null;
  onCommit: (next: FilterCondition | null) => void;
  onDraftChange?: (next: FilterCondition | null) => void;
  labels: FilterValuePanelLabels;
  autoFocus?: boolean;
}

export function FilterValuePanel({
  field,
  condition,
  onCommit,
  onDraftChange,
  labels,
  autoFocus = true,
}: FilterValuePanelProps): JSX.Element {
  const emit = (next: FilterCondition | null) => onDraftChange?.(next);

  if (field.input === 'tree') {
    return (
      <TreePanel
        field={field}
        condition={condition}
        labels={labels}
        autoFocus={autoFocus}
        onDraftChange={emit}
      />
    );
  }
  if (field.input === 'dateRange') {
    return <DateRangePanel field={field} condition={condition} labels={labels} onDraftChange={emit} />;
  }
  if (field.input === 'text') {
    return (
      <TextPanel
        field={field}
        condition={condition}
        labels={labels}
        autoFocus={autoFocus}
        onCommit={onCommit}
        onDraftChange={emit}
      />
    );
  }
  return (
    <SelectPanel
      field={field}
      condition={condition}
      labels={labels}
      autoFocus={autoFocus}
      onCommit={onCommit}
      onDraftChange={emit}
    />
  );
}
