import { useMemo, useState, type JSX } from 'react';
import { Switch } from '@/components/ui/switch';
import { PickerPanel, type PickerNode } from '../../PickerPanel';
import type { FilterCondition, FilterFieldDef } from '../../filter-builder/types';
import { CommitHint } from './CommitHint';
import { conditionId, toStringList } from './panel-utils';
import type { FilterValuePanelLabels } from './labels';

export function TreePanel({
  field,
  condition,
  labels,
  autoFocus,
  onDraftChange,
}: {
  field: Extract<FilterFieldDef, { input: 'tree' }>;
  condition: FilterCondition | null;
  labels: FilterValuePanelLabels;
  autoFocus: boolean;
  onDraftChange: (next: FilterCondition | null) => void;
}): JSX.Element {
  const [selected, setSelected] = useState<string[]>(() => toStringList(condition?.value ?? null));
  const [includeSub, setIncludeSub] = useState(condition?.scope !== 'exact');
  const nodes: PickerNode[] = useMemo(
    () =>
      field.options.map((option) => ({
        value: option.value,
        label: option.label,
        parentValue: option.parentValue,
      })),
    [field.options],
  );

  const publish = (nextSelected: string[], nextIncludeSub: boolean) => {
    if (nextSelected.length === 0) {
      onDraftChange(null);
      return;
    }
    onDraftChange({
      id: conditionId(field.key, condition),
      field: field.key,
      operator: 'in',
      value: nextSelected,
      scope: nextIncludeSub ? undefined : 'exact',
    });
  };

  return (
    <div data-slot="filter-value-panel" data-kind="tree">
      <PickerPanel
        nodes={nodes}
        value={selected}
        multiple
        density="compact"
        autoFocus={autoFocus}
        labels={{ ...field.pickerLabels, empty: labels.empty }}
        aria-label={field.label}
        onChange={(next) => {
          const list = toStringList(next);
          setSelected(list);
          publish(list, includeSub);
        }}
      />
      <label className="flex items-center gap-[calc(8px*var(--app-scale))] px-[calc(12px*var(--app-scale))] py-[calc(8px*var(--app-scale))] text-[calc(12.5px*var(--app-scale))] text-(--type-2-fg)">
        <Switch
          size="sm"
          checked={includeSub}
          onCheckedChange={(checked) => {
            const next = checked === true;
            setIncludeSub(next);
            publish(selected, next);
          }}
        />
        {labels.includeSub}
      </label>
      <CommitHint text={labels.commitHint} />
    </div>
  );
}
