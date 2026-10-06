import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { FunnelX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';

// 空态族状态矩阵：默认空态 + 三型（首次使用 / 无结果 / 无权限）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function EmptyMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="emptyMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div data-testid="emptyCustomIconMatrix" className="mb-4 grid grid-cols-2 gap-4">
        {(['default', 'accent'] as const).map((iconTone) => (
          <Empty
            key={iconTone}
            icon={<FunnelX aria-hidden="true" />}
            iconSize="compact"
            iconTone={iconTone}
            title={t('dev.themeStates.emptyNoResultTitle')}
            description={t('dev.themeStates.emptyNoResultDesc')}
          />
        ))}
      </div>
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.emptyVariantMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.emptyVariantNote')}</p>
      </div>
      <div className="grid gap-4">
        <div className="rounded-md border border-border bg-surface-2 p-4">
          <Empty
            title={t('dev.themeStates.emptyTitle')}
            description={t('dev.themeStates.emptyDesc')}
            action={<Button variant="outline">{t('dev.themeStates.emptyAction')}</Button>}
          />
        </div>

        <div data-testid="emptyVariantMatrix" className="rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.emptyVariantMatrix')}</p>
          <p className="mb-3 text-xs text-text-3">{t('dev.themeStates.emptyVariantNote')}</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-surface p-4">
              <Empty
                variant="firstUse"
                title={t('dev.themeStates.emptyFirstUseTitle')}
                description={t('dev.themeStates.emptyFirstUseDesc')}
                action={
                  <>
                    <Button size="sm">{t('dev.themeStates.emptyFirstUsePrimary')}</Button>
                    <Button size="sm" variant="secondary">
                      {t('dev.themeStates.emptyFirstUseSecondary')}
                    </Button>
                    <Button size="sm" variant="link">
                      {t('dev.themeStates.emptyFirstUseLink')}
                    </Button>
                  </>
                }
              />
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              <Empty
                variant="noResult"
                title={t('dev.themeStates.emptyNoResultTitle')}
                description={t('dev.themeStates.emptyNoResultDesc')}
                action={
                  <>
                    <Button size="sm" variant="secondary">
                      {t('dev.themeStates.emptyNoResultSecondary')}
                    </Button>
                    <Button size="sm" variant="link">
                      {t('dev.themeStates.emptyNoResultLink')}
                    </Button>
                  </>
                }
              />
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              <Empty
                variant="noPermission"
                title={t('dev.themeStates.emptyNoPermissionTitle')}
                description={t('dev.themeStates.emptyNoPermissionDesc')}
                action={
                  <>
                    <Button size="sm" variant="secondary">
                      {t('dev.themeStates.emptyNoPermissionSecondary')}
                    </Button>
                    <Button size="sm" variant="link">
                      {t('dev.themeStates.emptyNoPermissionLink')}
                    </Button>
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
