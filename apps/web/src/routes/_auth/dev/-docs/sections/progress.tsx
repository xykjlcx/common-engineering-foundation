import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ProgressBar } from '@/components/ui/progress';

// 进度条状态矩阵（ProgressBar 低 / 高两档）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function ProgressMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="progressMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.progressMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.step6MatrixDesc')}</p>
      </div>
      <div className="grid gap-4 rounded-md border border-border bg-surface p-4">
        <ProgressBar value={32} aria-label={t('dev.themeStates.progressLow')} />
        <ProgressBar value={76} aria-label={t('dev.themeStates.progressHigh')} />
      </div>
    </section>
  );
}
