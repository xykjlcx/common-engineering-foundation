import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

// 徽章族状态矩阵：七个语义色 × 带点 / 不带点。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

const badgeVariantsForThemeStates = [
  'neutral',
  'primary',
  'success',
  'warning',
  'danger',
  'purple',
  'teal',
] as const;
const badgeVariantLabelKeys: Record<(typeof badgeVariantsForThemeStates)[number], string> = {
  neutral: 'dev.themeStates.badgeNeutral',
  primary: 'dev.themeStates.badgePrimary',
  success: 'dev.themeStates.badgeSuccess',
  warning: 'dev.themeStates.badgeWarning',
  danger: 'dev.themeStates.badgeDanger',
  purple: 'dev.themeStates.badgePurple',
  teal: 'dev.themeStates.badgeTeal',
};

export default function BadgeMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="badgeMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.badgeMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.badgeMatrixDesc')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.badgeNoDot')}</p>
          <div className="flex flex-wrap items-center gap-2">
            {badgeVariantsForThemeStates.map((variant) => (
              <Badge key={variant} variant={variant}>
                {t(badgeVariantLabelKeys[variant])}
              </Badge>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.badgeWithDot')}</p>
          <div className="flex flex-wrap items-center gap-2">
            {badgeVariantsForThemeStates.map((variant) => (
              <Badge key={variant} variant={variant} dot dotTestId={`badge-dot-${variant}`}>
                {t(badgeVariantLabelKeys[variant])}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
