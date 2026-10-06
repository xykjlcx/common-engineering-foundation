import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { MoonIcon, SlidersHorizontalIcon, SunIcon } from 'lucide-react';
import { SoftSegmented, SoftSegmentedItem } from '@/components/ui/soft-segmented';
import { SoftSwitch } from '@/components/ui/soft-switch';

// 软浮起实验件状态矩阵（SoftSwitch / SoftSegmented，走 --soft-* token）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function SoftControlsMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="softControlsMatrix"
      className="grid gap-4 rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <div>
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.softControlsMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.softControlsMatrixDesc')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-4 rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.softSwitch')}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-text">
              <SoftSwitch aria-label={t('dev.themeStates.switchEnabled')} defaultChecked />
              <span>{t('dev.themeStates.switchEnabled')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-text">
              <SoftSwitch aria-label={t('dev.themeStates.switchUnchecked')} />
              <span>{t('dev.themeStates.switchUnchecked')}</span>
            </label>
            <label className="flex cursor-not-allowed items-center gap-3 text-sm text-text">
              <SoftSwitch aria-label={t('dev.themeStates.switchDisabled')} disabled />
              <span>{t('dev.themeStates.switchDisabled')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-text">
              <SoftSwitch
                aria-label={t('dev.themeStates.softSwitchIcon')}
                iconChecked={<MoonIcon />}
                iconUnchecked={<SunIcon />}
              />
              <span>{t('dev.themeStates.softSwitchIcon')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-text">
              <SoftSwitch aria-label={t('dev.themeStates.softSwitchSm')} size="sm" defaultChecked />
              <span>{t('dev.themeStates.softSwitchSm')}</span>
            </label>
            <label className="flex cursor-not-allowed items-center gap-3 text-sm text-text">
              <SoftSwitch aria-label={t('dev.themeStates.softSwitchDisabledOn')} disabled defaultChecked />
              <span>{t('dev.themeStates.softSwitchDisabledOn')}</span>
            </label>
          </div>
        </div>
        <div className="grid gap-4 rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.softSegmented')}</p>
          <SoftSegmented defaultValue="light" aria-label={t('dev.themeStates.softSegmented')}>
            <SoftSegmentedItem value="light">
              <SunIcon />
              {t('dev.themeStates.softSegLight')}
            </SoftSegmentedItem>
            <SoftSegmentedItem value="dark">
              <MoonIcon />
              {t('dev.themeStates.softSegDark')}
            </SoftSegmentedItem>
            <SoftSegmentedItem value="system">
              <SlidersHorizontalIcon />
              {t('dev.themeStates.softSegSystem')}
            </SoftSegmentedItem>
          </SoftSegmented>
          <SoftSegmented defaultValue="dark" disabled aria-label={t('dev.themeStates.softSegmentedDisabled')}>
            <SoftSegmentedItem value="light">
              <SunIcon />
              {t('dev.themeStates.softSegLight')}
            </SoftSegmentedItem>
            <SoftSegmentedItem value="dark">
              <MoonIcon />
              {t('dev.themeStates.softSegDark')}
            </SoftSegmentedItem>
            <SoftSegmentedItem value="system">
              <SlidersHorizontalIcon />
              {t('dev.themeStates.softSegSystem')}
            </SoftSegmentedItem>
          </SoftSegmented>
        </div>
      </div>
    </section>
  );
}
