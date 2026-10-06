import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';

// 头像族状态矩阵：单人头像 + 在线状态点 / 头像组与计数位。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function AvatarMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="avatarMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.avatarMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.avatarMatrixDesc')}</p>
      </div>
      <div data-testid="avatarDensityMatrix" className="mb-4 flex items-center gap-4">
        {(['row', 'form', 'hero'] as const).map((size) => (
          <div key={size} className="flex items-center gap-2">
            <Avatar size={size}>
              <AvatarFallback>{t('dev.themeStates.avatarInitials')}</AvatarFallback>
            </Avatar>
            <Avatar size={size} muted>
              <AvatarFallback>{t('dev.themeStates.avatarInitials')}</AvatarFallback>
            </Avatar>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.avatarSingle')}</p>
          <Avatar size="lg">
            <AvatarFallback>{t('dev.themeStates.avatarInitials')}</AvatarFallback>
            <AvatarBadge aria-label={t('dev.themeStates.avatarStatus')} />
          </Avatar>
        </div>
        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.avatarGroup')}</p>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>{t('dev.themeStates.avatarInitials')}</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback>{t('dev.themeStates.avatarSecondaryInitials')}</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>{t('dev.themeStates.avatarCount')}</AvatarGroupCount>
          </AvatarGroup>
        </div>
      </div>
    </section>
  );
}
