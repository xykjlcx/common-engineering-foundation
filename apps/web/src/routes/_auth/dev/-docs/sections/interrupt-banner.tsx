import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { InterruptBanner } from '@/components/pro/InterruptBanner';

// 中断通条状态矩阵（InterruptBanner warning / danger / success 三态）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function InterruptBannerMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="interruptBannerMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.interruptMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.interruptNote')}</p>
      </div>
      <div className="grid gap-2.5 rounded-md border border-border bg-surface p-4">
        <InterruptBanner
          tone="warning"
          message={t('dev.themeStates.interruptExpired')}
          action={{
            label: t('dev.themeStates.interruptExpiredAction'),
            onClick: () => undefined,
          }}
        />
        <InterruptBanner
          tone="danger"
          message={t('dev.themeStates.interruptOffline')}
          action={{
            label: t('dev.themeStates.interruptOfflineAction'),
            onClick: () => undefined,
          }}
        />
        <InterruptBanner
          tone="success"
          message={t('dev.themeStates.interruptRestored')}
          action={{
            label: t('dev.themeStates.interruptRestoredAction'),
            onClick: () => undefined,
          }}
        />
      </div>
    </section>
  );
}
