import { type KeyboardEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SelectControl, type SelectOption } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PickerPanel } from '../PickerPanel';
import { DateRangeFields } from '../filter-menu/panels/DateRangePanel';
import type { FilterValuePanelLabels } from '../filter-menu/panels/labels';
import type { FilterBuilderLabels } from './FilterBuilder';
import type { FilterCondition, FilterFieldDef } from './types';
import { isValuelessOperator } from './value';

export interface ConditionValueControlProps {
  condition: FilterCondition;
  field: FilterFieldDef | undefined;
  labels: FilterBuilderLabels;
  includeSubLabel?: string;
  panelLabels: FilterValuePanelLabels;
  onPatch: (patch: Partial<FilterCondition>) => void;
}

export function ConditionValueControl({
  condition,
  field,
  labels,
  includeSubLabel,
  panelLabels,
  onPatch,
}: ConditionValueControlProps) {
  if (isValuelessOperator(condition.operator)) return null;

  const kind = field?.input ?? 'text';
  const rangeValue = Array.isArray(condition.value) ? condition.value : [];
  const singleValue = typeof condition.value === 'string' ? condition.value : '';
  const multiValue = Array.isArray(condition.value) ? condition.value : [];

  if (field?.input === 'tree') {
    const selected = Array.isArray(condition.value) ? condition.value : singleValue ? [singleValue] : [];
    return (
      <div className="w-full min-w-0">
        <PickerPanel
          nodes={field.options.map((option) => ({
            value: option.value,
            label: option.label,
            parentValue: option.parentValue,
          }))}
          value={selected}
          multiple
          density="compact"
          labels={field.pickerLabels}
          aria-label={labels.value}
          onChange={(next) => onPatch({ value: Array.isArray(next) ? next : next ? [next] : [] })}
        />
        {includeSubLabel !== undefined && (
          <label className="flex items-center gap-[calc(8px*var(--app-scale))] px-[calc(12px*var(--app-scale))] py-[calc(8px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))]">
            <Switch
              size="sm"
              checked={condition.scope !== 'exact'}
              onCheckedChange={(checked) => onPatch({ scope: checked ? undefined : 'exact' })}
            />
            {includeSubLabel}
          </label>
        )}
      </div>
    );
  }

  if (kind === 'dateRange') {
    // 与二级面板同源：快捷项 + 起止 mono 输入（review B2）
    const [from, to] = Array.isArray(condition.value) ? condition.value : ['', ''];
    return (
      <div className="w-full min-w-0">
        <DateRangeFields
          from={typeof from === 'string' ? from : ''}
          to={typeof to === 'string' ? to : ''}
          labels={panelLabels}
          onRangeChange={(next) => onPatch({ operator: 'between', value: next })}
        />
      </div>
    );
  }

  if (condition.operator === 'between') {
    const inputType = kind === 'number' ? 'number' : 'date';
    return (
      <div className="flex items-center gap-[calc(6px*var(--app-scale))]">
        <Input
          type={inputType}
          aria-label={labels.rangeFrom}
          value={rangeValue[0] ?? ''}
          onChange={(event) => onPatch({ value: [event.target.value, rangeValue[1] ?? ''] })}
        />
        <Input
          type={inputType}
          aria-label={labels.rangeTo}
          value={rangeValue[1] ?? ''}
          onChange={(event) => onPatch({ value: [rangeValue[0] ?? '', event.target.value] })}
        />
      </div>
    );
  }

  if (kind === 'multiSelect' || condition.operator === 'in' || condition.operator === 'notIn') {
    return (
      <div
        role="group"
        aria-label={labels.value}
        className="grid max-h-[calc(180px*var(--app-scale))] gap-[calc(6px*var(--app-scale))] overflow-y-auto"
      >
        {(field?.options ?? []).map((option) => {
          const checked = multiValue.includes(option.value);
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-[calc(8px*var(--app-scale))] text-[calc(13px*var(--app-scale))]"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(next) => {
                  const set = new Set(multiValue);
                  if (next) set.add(option.value);
                  else set.delete(option.value);
                  onPatch({ value: [...set] });
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (kind === 'select') {
    const options: SelectOption[] = (field?.options ?? []).map((option) => ({
      value: option.value,
      label: option.label,
    }));

    return (
      <SelectControl
        size="sm"
        aria-label={labels.value}
        placeholder={field?.placeholder}
        value={singleValue}
        options={options}
        onValueChange={(next) => onPatch({ value: next })}
      />
    );
  }

  const inputType = kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text';

  return (
    <Input
      type={inputType}
      aria-label={labels.value}
      placeholder={field?.placeholder}
      value={singleValue}
      onChange={(event) => onPatch({ value: event.target.value })}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') event.preventDefault();
      }}
    />
  );
}
