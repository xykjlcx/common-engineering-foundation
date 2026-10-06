import { useState, type JSX } from 'react';
import { DateRangePicker } from '../../DateRangePicker';
import type { FilterCondition, FilterFieldDef } from '../../filter-builder/types';
import { DATE_RE, quickRangeDates } from '../date-range';
import { CommitHint } from './CommitHint';
import { conditionId } from './panel-utils';
import type { FilterValuePanelLabels } from './labels';

export function DateRangeFields({
  from,
  to,
  labels,
  onRangeChange,
}: {
  from: string;
  to: string;
  labels: FilterValuePanelLabels;
  onRangeChange: (next: [string, string]) => void;
}): JSX.Element {
  return (
    <div data-slot="filter-date-range">
      <div className="mb-[calc(8px*var(--app-scale))] flex flex-wrap gap-[calc(6px*var(--app-scale))]">
        {labels.quickRanges.map((range) => (
          <button
            key={range.key}
            type="button"
            data-slot="filter-quick-range"
            className="h-[calc(26px*var(--app-scale))] cursor-pointer rounded-md px-[calc(10px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))] text-(--type-2-fg) hover:bg-(--menu-item-bg-highlighted)"
            onClick={() => onRangeChange(quickRangeDates(range.key))}
          >
            {range.label}
          </button>
        ))}
      </div>
      <DateRangePicker
        locale={labels.calendarLocale}
        aria-label={`${labels.rangeFrom} ~ ${labels.rangeTo}`}
        value={from === '' && to === '' ? null : [from, to]}
        labels={{ start: labels.rangeFrom, end: labels.rangeTo, clear: labels.clearText }}
        onChange={(next) => onRangeChange([next?.[0] ?? '', next?.[1] ?? ''])}
      />
    </div>
  );
}

export function DateRangePanel({
  field,
  condition,
  labels,
  onDraftChange,
}: {
  field: FilterFieldDef;
  condition: FilterCondition | null;
  labels: FilterValuePanelLabels;
  onDraftChange: (next: FilterCondition | null) => void;
}): JSX.Element {
  const initial = Array.isArray(condition?.value) ? condition.value : ['', ''];
  const [range, setRange] = useState<[string, string]>([
    typeof initial[0] === 'string' ? initial[0] : '',
    typeof initial[1] === 'string' ? initial[1] : '',
  ]);

  const publish = (next: [string, string]) => {
    setRange(next);
    const valid = DATE_RE.test(next[0]) && DATE_RE.test(next[1]);
    onDraftChange(
      valid
        ? {
            id: conditionId(field.key, condition),
            field: field.key,
            operator: 'between',
            value: next,
          }
        : null,
    );
  };

  return (
    <div data-slot="filter-value-panel" data-kind="dateRange" className="p-[calc(10px*var(--app-scale))]">
      <DateRangeFields from={range[0]} to={range[1]} labels={labels} onRangeChange={publish} />
      <CommitHint text={labels.commitHint} />
    </div>
  );
}
