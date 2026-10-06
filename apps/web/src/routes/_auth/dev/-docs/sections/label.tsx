import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

// 标签族状态矩阵：独立 Label + 三种 peer 豁免锚点（checkbox / radio / switch）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function LabelMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="labelMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.labelMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.labelMatrixDesc')}</p>
      </div>
      {/* peer 豁免的验证载体：peer 元素（checkbox/radio-group-item/switch）须带 .peer 类且是 Label 的前置兄弟，
          豁免规则 .peer[data-slot=checkbox] ~ label 才能命中。switch 根 / RadioGroupItem 自带 peer；checkbox 外层 span
          的 peer 在内层 input 上，故显式补 className="peer" 让外层（带 data-slot=checkbox）成为 peer 锚点。
          radio：RadioGroupItem 自带 peer + data-slot=radio-group-item，与 Label 同为 RadioGroup 直接子级（前置兄弟）才命中豁免。 */}
      <div data-testid="labelPeerMatrix" className="grid gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.labelStandalone')}</p>
          <Label htmlFor="theme-label-standalone">{t('dev.themeStates.labelStandalone')}</Label>
          <Input id="theme-label-standalone" placeholder={t('dev.themeStates.focusPlaceholder')} />
        </div>
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.labelCheckbox')}</p>
          <div className="flex items-center gap-2">
            <Checkbox className="peer" aria-label={t('dev.themeStates.labelCheckbox')} checked readOnly />
            <Label>{t('dev.themeStates.labelCheckbox')}</Label>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.labelRadio')}</p>
          <RadioGroup defaultValue="on" className="flex items-center gap-2">
            <RadioGroupItem value="on" aria-label={t('dev.themeStates.labelRadio')} />
            <Label>{t('dev.themeStates.labelRadio')}</Label>
          </RadioGroup>
        </div>
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.labelSwitch')}</p>
          <div className="flex items-center gap-2">
            <Switch aria-label={t('dev.themeStates.labelSwitch')} defaultChecked />
            <Label>{t('dev.themeStates.labelSwitch')}</Label>
          </div>
        </div>
      </div>
    </section>
  );
}
