import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark } from 'lucide-react';
import {
  FilterBuilder,
  countFilterConditions,
  isFilterGroup,
  type FilterRoot,
} from '@/components/pro/filter-builder';
import { FieldDescription } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { UsersQueryParams } from '../api';
import { useUserFilterFields } from './useUserFilterFields';

export function UsersFilterDialog({
  open,
  value,
  params,
  focusConditionId,
  onOpenChange,
  onApply,
  onSaveScheme,
}: {
  open: boolean;
  value: FilterRoot;
  params: UsersQueryParams;
  focusConditionId?: string;
  onOpenChange: (open: boolean) => void;
  onApply: (next: FilterRoot) => void;
  onSaveScheme: (next: FilterRoot) => void;
}): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <UsersFilterDialogBody
          value={value}
          params={params}
          focusConditionId={focusConditionId}
          onOpenChange={onOpenChange}
          onApply={onApply}
          onSaveScheme={onSaveScheme}
        />
      ) : null}
    </Dialog>
  );
}

function UsersFilterDialogBody({
  value,
  params,
  focusConditionId,
  onOpenChange,
  onApply,
  onSaveScheme,
}: {
  value: FilterRoot;
  params: UsersQueryParams;
  focusConditionId?: string;
  onOpenChange: (open: boolean) => void;
  onApply: (next: FilterRoot) => void;
  onSaveScheme: (next: FilterRoot) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  const { fields, operatorLabels, builderLabels, rowLabels, panelLabels } = useUserFilterFields(params);
  const [draft, setDraft] = useState<FilterRoot>(value);
  const count = countFilterConditions(draft);
  const groups = draft.items.filter(isFilterGroup).length;

  return (
    <DialogContent className="sm:max-w-[calc(760px*var(--app-scale))]">
      <DialogHeader>
        <DialogTitle>{t('users.filters.advancedTitle')}</DialogTitle>
        <DialogDescription size="compact">{t('users.filters.advancedSubtitle')}</DialogDescription>
      </DialogHeader>
      <FilterBuilder
        value={draft}
        onChange={setDraft}
        fields={fields}
        operatorLabels={operatorLabels}
        layout="rows"
        rowLabels={rowLabels}
        labels={builderLabels}
        includeSubLabel={t('users.filters.includeSubDept')}
        panelLabels={panelLabels}
        defaultOpenConditionId={focusConditionId}
      />
      <div className="flex items-center gap-[calc(8px*var(--app-scale))]">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            onApply(draft);
            onSaveScheme(draft);
          }}
        >
          <Bookmark data-icon="inline-start" aria-hidden="true" />
          {t('users.filters.saveScheme')}
        </Button>
        <FieldDescription size="compact">{t('users.filters.savedHint')}</FieldDescription>
      </div>
      <DialogFooter className="items-center sm:justify-between">
        <FieldDescription size="compact">
          {groups > 0
            ? t('users.filters.countSummaryGroups', { count, groups })
            : t('users.filters.countSummary', { count })}
        </FieldDescription>
        <div className="flex gap-[calc(8px*var(--app-scale))]">
          <Button type="button" variant="secondary" onClick={() => setDraft({ op: 'and', items: [] })}>
            {t('users.filters.chips.clear')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('users.actions.cancel')}
          </Button>
          <Button type="button" variant="primary" onClick={() => onApply(draft)}>
            {t('users.filters.apply', { count })}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
