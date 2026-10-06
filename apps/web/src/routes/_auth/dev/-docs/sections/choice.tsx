import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

// 勾选族状态矩阵（Checkbox / RadioGroup / Switch，走 --choice-* token）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function ChoiceMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="choiceMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.choiceMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step6MatrixDesc')}</p>
      </div>
      <div className="rounded-md border border-border bg-surface-2 p-4">
        <div className="grid gap-3 text-sm text-(--type-2-fg)">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox aria-label={t('dev.themeStates.choiceChecked')} checked readOnly />
            <span>{t('dev.themeStates.choiceChecked')}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox aria-label={t('dev.themeStates.choiceIndeterminate')} indeterminate readOnly />
            <span>{t('dev.themeStates.choiceIndeterminate')}</span>
          </label>
          <label className="flex cursor-not-allowed items-center gap-2">
            <Checkbox aria-label={t('dev.themeStates.choiceDisabled')} disabled />
            <span>{t('dev.themeStates.choiceDisabled')}</span>
          </label>
          <RadioGroup defaultValue="invalid" className="grid grid-cols-2 gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="enabled" aria-label={t('dev.themeStates.radioEnabled')} />
              <span>{t('dev.themeStates.radioEnabled')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="invalid" aria-label={t('dev.themeStates.radioInvalid')} aria-invalid />
              <span>{t('dev.themeStates.radioInvalid')}</span>
            </label>
          </RadioGroup>
          <label className="flex cursor-pointer items-center gap-2">
            <Switch aria-label={t('dev.themeStates.switchEnabled')} defaultChecked />
            <span>{t('dev.themeStates.switchEnabled')}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <Switch aria-label={t('dev.themeStates.switchUnchecked')} />
            <span>{t('dev.themeStates.switchUnchecked')}</span>
          </label>
          <label className="flex cursor-not-allowed items-center gap-2">
            <Switch aria-label={t('dev.themeStates.switchDisabled')} disabled />
            <span>{t('dev.themeStates.switchDisabled')}</span>
          </label>
        </div>
      </div>
    </section>
  );
}
