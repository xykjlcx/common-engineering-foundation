import type { ReactNode } from 'react';
import { Check, Globe2, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '@/stores/appearance';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TableText } from '@/components/pro/TableText';

export function AuthPageLayout({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const mode = useAppearance((state) => state.mode);
  const setAppearance = useAppearance((state) => state.set);
  const toggleLanguage = () => {
    const next = i18n.language.startsWith('zh') ? 'en-US' : 'zh-CN';
    void i18n.changeLanguage(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  };
  if (compact)
    return (
      <main className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-canvas text-text">
        <header className="flex shrink-0 items-center justify-between gap-4 px-6 py-5">
          <TableText tone="strong">{t('auth.hero.brand')}</TableText>
          <div className="flex gap-2">
            <Button type="button" variant="text" size="sm" onClick={toggleLanguage}>
              <Globe2 data-icon="inline-start" />
              {i18n.language.startsWith('zh') ? 'English' : '简体中文'}
            </Button>
            <Button
              type="button"
              variant="text"
              size="icon-sm"
              aria-label={t('auth.switchTheme')}
              onClick={() => setAppearance({ mode: mode === 'dark' ? 'light' : 'dark' })}
            >
              {mode === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>
        <div className="my-auto w-full max-w-[calc(520px*var(--app-scale))] self-center px-5 py-8">
          <Card spacing="comfortable">
            <CardContent>{children}</CardContent>
          </Card>
        </div>
        <footer className="flex shrink-0 justify-center px-6 py-5">
          <TableText tone="hint">{t('auth.hero.footer')}</TableText>
        </footer>
      </main>
    );
  return (
    <main className="fixed inset-0 z-[200] flex bg-surface text-text">
      <section className="ui-auth-hero relative hidden w-[44%] max-w-[calc(640px*var(--app-scale))] flex-col overflow-hidden px-[calc(48px*var(--app-scale))] py-[calc(48px*var(--app-scale))] lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-10 bg-(--accent-emphasis) text-sm font-bold text-(--button-primary-fg)">
            {t('auth.hero.mark')}
          </div>
          <div>
            <div className="font-bold">{t('auth.hero.brand')}</div>
            <div className="text-xs text-text-3">{t('auth.hero.subtitle')}</div>
          </div>
        </div>
        <div className="my-auto">
          <h2 className="ui-page-title text-[calc(42px*var(--app-scale))] font-extrabold leading-tight">
            {t('auth.hero.headline1')}
            <br />
            <span className="text-(--accent-emphasis)">{t('auth.hero.headline2')}</span>
          </h2>
          <p className="mt-5 text-sm leading-7 text-(--type-2-fg)">{t('auth.hero.desc')}</p>
          <div className="mt-8 grid gap-3">
            {['permission', 'business', 'design'].map((key) => (
              <span key={key} className="flex items-center gap-2 text-sm text-(--type-2-fg)">
                <Check className="size-4 text-(--accent-emphasis)" />
                {t(`auth.hero.points.${key}`)}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-[calc(40px*var(--app-scale))] py-[calc(32px*var(--app-scale))]">
        <div className="flex justify-end gap-3 text-sm text-(--type-2-fg)">
          <Button
            type="button"
            variant="text"
            size="xs"
            className="gap-1.5 text-(--type-2-fg)"
            onClick={toggleLanguage}
          >
            <Globe2 data-icon="inline-start" />
            {i18n.language.startsWith('zh') ? 'English' : '简体中文'}
          </Button>
          <Button
            type="button"
            variant="text"
            size="xs"
            className="gap-1.5 text-(--type-2-fg)"
            onClick={() => setAppearance({ mode: mode === 'dark' ? 'light' : 'dark' })}
          >
            {mode === 'dark' ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
            {t('auth.switchTheme')}
          </Button>
        </div>
        <div className="my-auto w-full max-w-[calc(440px*var(--app-scale))] self-center">{children}</div>
      </section>
    </main>
  );
}
