import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

// 按钮族状态矩阵：十一个 variant + loading / disabled / 图标钮。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

const buttonVariantsForThemeStates = [
  'default',
  'primary',
  'secondary',
  'outline',
  'dashed',
  'text',
  'ghost',
  'link',
  'danger',
  'destructive',
  'danger-ghost',
] as const;
const buttonVariantLabelKeys: Record<(typeof buttonVariantsForThemeStates)[number], string> = {
  default: 'dev.themeStates.buttonDefault',
  primary: 'dev.themeStates.buttonPrimary',
  secondary: 'dev.themeStates.buttonSecondary',
  outline: 'dev.themeStates.buttonOutline',
  dashed: 'dev.themeStates.buttonDashed',
  text: 'dev.themeStates.buttonText',
  ghost: 'dev.themeStates.buttonGhost',
  link: 'dev.themeStates.buttonLink',
  danger: 'dev.themeStates.buttonDanger',
  destructive: 'dev.themeStates.buttonDestructive',
  'danger-ghost': 'dev.themeStates.buttonDangerGhost',
};

export default function ButtonMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="buttonMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.buttonMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.buttonMatrixDesc')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {buttonVariantsForThemeStates.map((variant) => (
          <Button key={variant} variant={variant}>
            {t(buttonVariantLabelKeys[variant])}
          </Button>
        ))}
        <Button loading>{t('dev.themeStates.buttonLoading')}</Button>
        <Button disabled>{t('dev.themeStates.buttonDisabled')}</Button>
        <Button variant="ghost" size="icon" aria-label={t('dev.themeStates.buttonIcon')}>
          <span data-icon="theme-states" className="font-semibold">
            i
          </span>
        </Button>
      </div>
    </section>
  );
}
